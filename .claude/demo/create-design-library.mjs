// Creates or updates "My French School Design Library": the library itself, its style book (colors in STYLE_BOOK
// below), its fragment set, and the fragments in it (from the source folders in ./fragments, one
// folder per fragment key: fragment.json, index.html, index.css, optional configuration.json). Safe to rerun:
// every item is found by its external reference code or key first, and only created when missing. It never
// deletes anything.
//
// It ends by writing the numeric IDs it confirmed to design-library.json, which reference-demo.mjs reads.
// That file is an output only: this script never reads it, so rerunning the script always repairs it.
//
// A page that already places a fragment keeps its own copy of the code; only pages created
// after this run (for example by reference-demo.mjs) pick up the changes.
//
// Usage: node create-design-library.mjs
// Rehearse on a throwaway library (writes the IDs elsewhere, so design-library.json is untouched):
//   LIB_ERC=zz-test-lib LIB_NAME="ZZ Test Library" OUT=/tmp/ids.json node create-design-library.mjs
import fs from 'node:fs';
import path from 'node:path';

const B = 'http://localhost:8080';
const H = {Authorization: 'Basic ' + Buffer.from('test@liferay.com:test').toString('base64'), 'Content-Type': 'application/json'};
const DIR = path.join(import.meta.dirname, 'fragments');
const OUT = process.env.OUT || path.join(import.meta.dirname, 'design-library.json');

const LIB_ERC = process.env.LIB_ERC || 'f336ac67-c7f7-489a-edc5-2a069ec19126';
const LIB_NAME = process.env.LIB_NAME || 'My French School Design Library';
const SET = {
	description: 'My French School building blocks styled with My French School Style Book tokens.',
	key: 'uni-fragment-set',
	name: 'My French School Fragment Set',
};

// Token name: [CSS variable, value]. Names and CSS variables come from the theme's token definition:
// unzip -p bundles/osgi/portal-war/classic-theme.war WEB-INF/frontend-token-definition.json

const STYLE_BOOK = {
	externalReferenceCode: '2',
	key: 'uni---style-book',
	name: 'My French School Style Book',
	themeId: 'classic_WAR_classictheme',
	tokens: {
		brandColor1: ['brand-color-1', '#DB0A7B'],
		brandColor2: ['brand-color-2', '#7E22CE'],
		brandColor3: ['brand-color-3', '#C026D3'],
		brandColor4: ['brand-color-4', '#3B0764'],
		primaryColor: ['primary', '#DB0A7B'],
		primaryD1Color: ['primary-d1', '#B80066'],
		primaryD2Color: ['primary-d2', '#8F004F'],
		primaryL0Color: ['primary-l0', '#F0479F'],
		primaryL1Color: ['primary-l1', '#F783BE'],
		primaryL2Color: ['primary-l2', '#FBC4E0'],
		primaryL3Color: ['primary-l3', '#FFF0F7'],
		secondaryColor: ['secondary', '#7E22CE'],
		secondaryD1Color: ['secondary-d1', '#6B21A8'],
		secondaryD2Color: ['secondary-d2', '#581C87'],
		secondaryL0Color: ['secondary-l0', '#A855F7'],
		secondaryL1Color: ['secondary-l1', '#C084FC'],
		secondaryL2Color: ['secondary-l2', '#E9D5FF'],
		secondaryL3Color: ['secondary-l3', '#FAF5FF'],
	},
};

const frontendTokensValues = Object.fromEntries(
	Object.entries(STYLE_BOOK.tokens).map(([name, [cssVariableMapping, value]]) => [
		`${STYLE_BOOK.themeId}:${name}`, {cssVariableMapping, tokenDefinitionId: STYLE_BOOK.themeId, value},
	])
);

// Returns null on 404, so callers can create what is missing; exits on any other error

async function call(method, urlPath, body) {
	const r = await fetch(B + urlPath, {body: body && JSON.stringify(body), headers: H, method});
	const t = await r.text();
	if (r.status === 404 && method === 'GET') {
		return null;
	}
	if (r.status >= 300) {
		console.log(method, urlPath, r.status, t.slice(0, 600));
		process.exit(1);
	}
	return t ? JSON.parse(t) : null;
}

async function ws(method, params) {
	const r = await fetch(B + '/api/jsonws/invoke', {body: JSON.stringify({[method]: params}), headers: H, method: 'POST'});
	const t = await r.text();
	if (!r.ok || t.includes('"exception"')) {
		console.log(method, r.status, t.slice(0, 600));
		process.exit(1);
	}
	return JSON.parse(t);
}

const read = (key, file) => {
	const p = path.join(DIR, key, file);
	return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : '';
};

// 1. Library

const LIB_PATH = `/o/headless-asset-library/v1.0/asset-libraries/${LIB_ERC}`;
let lib = await call('GET', LIB_PATH);
console.log(lib ? 'found' : 'created', 'library', LIB_ERC);
lib ??= await call('POST', '/o/headless-asset-library/v1.0/asset-libraries', {externalReferenceCode: LIB_ERC, name: LIB_NAME, type: 'DesignLibrary'});
const GROUP_ID = lib.siteId;

// 2. Style book: create if missing, then always write the colors (PATCH writes the published version)

const BOOK_PATH = `/o/headless-admin-site/v1.0/design-libraries/${LIB_ERC}/style-books`;
const book = await call('GET', `${BOOK_PATH}/${STYLE_BOOK.externalReferenceCode}`);
console.log(book ? 'found' : 'created', 'style book', STYLE_BOOK.externalReferenceCode);
if (!book) {
	await call('POST', BOOK_PATH, {externalReferenceCode: STYLE_BOOK.externalReferenceCode, key: STYLE_BOOK.key, name: STYLE_BOOK.name, themeId: STYLE_BOOK.themeId});
}
await call('PATCH', `${BOOK_PATH}/${STYLE_BOOK.externalReferenceCode}`, {frontendTokensValues: JSON.stringify(frontendTokensValues)});
console.log('updated style book colors', Object.keys(frontendTokensValues).length, 'tokens');

// 3. Fragment set (the REST endpoints need LPD-39244, which is off, so JSON-WS)

let set = (await ws('/fragment.fragmentcollection/get-fragment-collections', {groupId: GROUP_ID})).find((c) => c.fragmentCollectionKey === SET.key);
console.log(set ? 'found' : 'created', 'fragment set', SET.key);
set ??= await ws('/fragment.fragmentcollection/add-fragment-collection', {
	description: SET.description, externalReferenceCode: SET.key, fragmentCollectionKey: SET.key, groupId: GROUP_ID, marketplace: false,
	name: SET.name, serviceContext: {},
});
const COLLECTION_ID = Number(set.fragmentCollectionId);

// 4. Fragments

const existing = Object.fromEntries(
	(await ws('/fragment.fragmententry/get-fragment-entries', {fragmentCollectionId: COLLECTION_ID})).map((e) => [e.fragmentEntryKey, e])
);

for (const key of fs.readdirSync(DIR).sort()) {
	const meta = JSON.parse(read(key, 'fragment.json'));
	const code = {
		cacheable: false,
		configuration: read(key, 'configuration.json'),
		css: read(key, 'index.css'),
		fragmentCollectionId: COLLECTION_ID,
		html: read(key, 'index.html'),
		icon: meta.icon,
		js: read(key, 'index.js'),
		name: meta.name,
		previewFileEntryId: 0,
		readOnly: false,
		status: 0,
		typeOptions: '',
	};
	const e = existing[key];
	const f = e
		? await ws('/fragment.fragmententry/update-fragment-entry', {...code, fragmentEntryId: e.fragmentEntryId})
		: await ws('/fragment.fragmententry/add-fragment-entry', {
			...code, externalReferenceCode: key, fragmentEntryKey: key, groupId: GROUP_ID, marketplace: false, serviceContext: {}, type: 0,
		});
	console.log(e ? 'updated' : 'created', key, `id=${f.fragmentEntryId} status=${f.status} name="${f.name}"`);
}

// 5. IDs for reference-demo.mjs

const ids = {
	_note: 'Written by create-design-library.mjs; local to this database. Rerun that script to refresh it.',
	fragmentCollectionId: COLLECTION_ID,
	fragmentSetKey: SET.key,
	groupId: Number(GROUP_ID),
	libraryErc: LIB_ERC,
	styleBookErc: STYLE_BOOK.externalReferenceCode,
};
fs.writeFileSync(OUT, JSON.stringify(ids, null, '\t') + '\n');
console.log('wrote', OUT);
