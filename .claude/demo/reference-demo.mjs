// Reference for the demo. Helpers and calls verified in a dry run on 2026-10-13 (all calls 200; the
// page renders the library fragments and the library style book for a signed-out visitor).
// 2026-10-15: elements() rewritten for the new section fragments and withPositions() fixed to link children to
// parents; verified rendered (signed out HTML checks + browser screenshot) on rehearsal site zz-preview.
// Copy it, change the content, run it.
//
// Usage: node reference-demo.mjs <siteErc> "<Site Name>"

const [SITE, SITE_NAME] = process.argv.slice(2);
const B = 'http://localhost:8080';
const H = {Authorization: 'Basic ' + Buffer.from('test@liferay.com:test').toString('base64'), 'Content-Type': 'application/json'};
const LIB = 'f336ac67-c7f7-489a-edc5-2a069ec19126';

async function call(method, path, body) {
	const t0 = Date.now();
	const r = await fetch(B + path, {body: body && JSON.stringify(body), headers: H, method});
	const text = await r.text();
	console.log(method, path, r.status, (Date.now() - t0) + 'ms');
	if (r.status >= 300) {
		console.log(text.slice(0, 1500));
		process.exit(1);
	}
	return text ? JSON.parse(text) : null;
}

// Library fragment code, inlined on every placed instance (required for non built-in fragments)

const libraryFragments = Object.fromEntries((await (await fetch(B + '/api/jsonws/invoke', {
	body: JSON.stringify({'/fragment.fragmententry/get-fragment-entries': {fragmentCollectionId: 36822}}),
	headers: H,
	method: 'POST',
})).json()).map((e) => [e.fragmentEntryKey, e]));

// Element helpers. Style values are token names: primaryColor -> var(--primary)

const text = (v) => ({type: 'Text', fragmentLinkTextValue: {textFragmentValue: {type: 'Inline', fragmentInlineValue: {value_i18n: {en_US: v}}}}});

const frag = (name, editables = {}, config = {}, style) => ({
	pageElementDefinition: {
		type: 'BasicFragment',
		fragmentInstance: {
			fragmentReference: {fragmentReferenceType: 'FragmentItemExternalReference', className: 'com.liferay.fragment.model.FragmentEntry', externalReferenceCode: 'uni-' + name, scope: {type: 'AssetLibrary', externalReferenceCode: LIB}},
			configuration: libraryFragments['uni-' + name].configuration,
			css: libraryFragments['uni-' + name].css,
			html: libraryFragments['uni-' + name].html,
			fragmentEditableElements: Object.entries(editables).map(([id, v]) => ({id, fragmentEditableElementValue: text(v)})),
			fragmentConfigurationFieldValues: Object.fromEntries(Object.entries(config).map(([k, v]) => [k, {type: 'Select', value: v}])),
			...(style ? {fragmentViewports: [{id: 'Desktop', fragmentViewportStyle: style}]} : {}),
		},
	},
});

const box = (style, children, layout = {widthType: 'Fluid'}) => ({
	pageElementDefinition: {type: 'Container', layout, fragmentViewports: [{id: 'Desktop', fragmentViewportStyle: style}]},
	pageElements: children,
});

// Nesting needs explicit links: without an ERC on each element and parentExternalReferenceCode on each child,
// the API saves every element flat under the root (containers render empty). ERCs must be unique within the site.

const withPositions = (list, prefix, parent) => list.map((e, i) => {
	const erc = `${prefix}-${i}`;
	return {
		...e, externalReferenceCode: erc, position: i,
		...(parent ? {parentExternalReferenceCode: parent} : {}),
		...(e.pageElements ? {pageElements: withPositions(e.pageElements, erc, erc)} : {}),
	};
});

const card = (title, body, link) => frag('card', {'02-title': title, '03-content': body, '04-link': link}, {}, {marginRight: '3', width: '30%'});

const elements = (prefix) => withPositions([
	frag('hero', {
		title: 'Speak French with confidence',
		text: `Small classes, native teachers and a method that gets you talking from the first lesson. Spring enrollment at ${SITE_NAME} is now open.`,
		cta: 'Book a free class',
	}, {tone: 'purple'}),
	frag('feature-trio', {
		'title-1': 'Learn at your own pace', 'text-1': 'Morning, evening or weekend groups. Switch schedules whenever life gets busy.',
		'title-2': 'Speak from day one', 'text-2': 'Every lesson is built around real conversation, not grammar drills.',
		'title-3': 'Certified for real life', 'text-3': 'Prepare for the DELF and DALF exams with teachers who know them inside out.',
		'footer-title': 'A method built for every level',
		'footer-text': 'From your first « bonjour » to debating Proust: A1 to C2, in person or online.',
	}),
	box({backgroundColor: 'secondaryL3Color', paddingTop: '5', paddingBottom: '5', paddingLeft: '5', paddingRight: '5'}, [box({}, [
		frag('heading', {'element-text': 'Our courses'}, {headingLevel: 'h2'}, {textColor: 'secondaryD2Color', marginBottom: '4'}),
		box({}, [
			card('Débutant · A1', 'Start from zero: greetings, numbers, everyday life.', 'Enroll'),
			card('Intermédiaire · B1', 'Hold real conversations and read the news.', 'Enroll'),
			card('Avancé · C1', 'Debate, write essays, and master the subjunctive.', 'Enroll'),
		], {contentDisplay: 'FlexRow', widthType: 'Fluid'}),
	], {widthType: 'Fixed'})]),
	frag('video-cta', {
		link: 'Watch a class',
		title: 'Un cours, une communauté',
		text: 'Games, songs and real conversations that make French stick. Watch two minutes of a real class, then come and join us.',
	}, {tone: 'pink'}),
	frag('feature-list', {
		'stat-1': '1,200+', 'stat-1-label': 'students this year',
		'stat-2': '98%', 'stat-2-label': 'DELF pass rate',
		'stat-3': '12', 'stat-3-label': 'native teachers',
		title: 'Why students choose us',
		intro: 'We keep groups small and lessons lively, so you speak more in a week than in a month of apps.',
		'item-1-title': 'Native teachers', 'item-1-text': 'Every teacher is a certified native speaker with years of classroom experience.',
		'item-2-title': 'Flexible schedule', 'item-2-text': 'Join any group that fits your week, and catch up online if you miss a class.',
		'item-3-title': 'Online and in person', 'item-3-text': 'Same teachers, same method, whether you sit in our classroom or at home.',
	}),
	box({backgroundColor: 'primaryColor', paddingTop: '5', paddingBottom: '5', paddingLeft: '5', paddingRight: '5'}, [box({}, [
		frag('heading', {'element-text': 'Spring enrollment closes soon'}, {headingLevel: 'h2'}, {textColor: 'whiteColor', marginBottom: '3'}),
		frag('paragraph', {'element-text': 'Seats are limited to 8 students per group. Reserve yours today.'}, {}, {textColor: 'whiteColor', marginBottom: '4'}),
		frag('button', {link: 'Reserve your seat'}, {buttonType: 'secondary'}),
	], {widthType: 'Fixed'})]),
]);

const settings = {styleBookItemExternalReference: {externalReferenceCode: '2', scope: {type: 'AssetLibrary', externalReferenceCode: LIB}}};

const spec = (erc, status, extra = {}) => ({
	type: 'ContentPageSpecification', externalReferenceCode: erc, status, settings,
	pageExperiences: [{externalReferenceCode: erc, key: 'DEFAULT', name_i18n: {en_US: 'Default'}, pageElements: elements(erc + '-el')}],
	...extra,
});

const PAGE = SITE + '-home';

await call('POST', '/o/headless-admin-site/v1.0/sites', {externalReferenceCode: SITE, membershipType: 'open', name: SITE_NAME});
await call('PUT', `/o/headless-asset-library/v1.0/asset-libraries/${LIB}/connected-sites/${SITE}`, {externalReferenceCode: SITE, searchable: true});
await call('POST', `/o/headless-admin-site/v1.0/sites/${SITE}/site-pages`, {
	externalReferenceCode: PAGE, friendlyUrlPath_i18n: {en_US: '/welcome'}, name_i18n: {en_US: 'Welcome'}, type: 'ContentPage',
	pageSpecifications: [spec(PAGE, 'Approved', {draftContentPageSpecificationExternalReferenceCode: PAGE + '-draft'}), spec(PAGE + '-draft', 'Draft')],
});

const site = await call('GET', `/o/headless-admin-site/v1.0/sites/${SITE}`);
console.log('URL', `${B}/web${site.friendlyUrlPath}/welcome`);
