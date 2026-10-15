// Creates or updates the library fragments in "My French School Fragment Set" from the source
// folders in ./fragments (one folder per fragment key: fragment.json, index.html, index.css,
// optional configuration.json). Safe to rerun. The set must exist first.
//
// A page that already places a fragment keeps its own copy of the code; only pages created
// after this run (for example by reference-demo.mjs) pick up the changes.
//
// Usage: node create-uni-fragments.mjs
import fs from 'node:fs';
import path from 'node:path';

const B = 'http://localhost:8080';
const H = {Authorization: 'Basic ' + Buffer.from('test@liferay.com:test').toString('base64'), 'Content-Type': 'application/json'};
const DIR = path.join(import.meta.dirname, 'fragments');
const GROUP_ID = 36311;
const COLLECTION_ID = 36822;

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
