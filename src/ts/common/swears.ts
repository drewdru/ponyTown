import { repeat } from 'lodash';
import { charsToCodes } from '../common/stringUtils';

const otherChars = 'ąăãçćıłńęśóöøğüțţťżź';
const wordBreakRU = `[^a-zA-Z\u0400-\u04FF${otherChars}}]`;
const wordStartRU = `(?:^|${wordBreakRU})`;
const wordEndRU = `(?=$|${wordBreakRU})`;

function createBadWords(fast: boolean) {
	const emoji = fast ? '*' : '😀-🙏☀-⛿✀-➿🚀-🛶⬀-⯯🌀-🗿';
	const separators1 = `:;!|\`"@#$%^&'*,._=+~\\-`; // \\(\\)\\{\\}\\]\\[
	const separators2 = `${separators1}\\(\\)/\\\\`;
	const sep = `[ ${emoji}${separators2}]`;
	const sep2 = `[${emoji}${separators2}]`;
	const sep3 = `[${emoji}${separators1}]`;
	const sep4 = `[${emoji}${separators1}\\(\\)\\{\\}\\]\\[]`;
	const sep5 = `[ ${emoji}${separators1}\\(\\)\\{\\}\\]\\[]`;
	const sep2OrNum = `[0-9${emoji}${separators2}]`;

	const onlyLetterT = fast ? 't' : 'tţțťтᴛ';

	const letter = {
		a: '[aаáα@4åα]',
		b: '[bв🅱]',
		c: '[cсćčçḉĉɕċƈȼ¢ς©ᴄ<]',
		e: '[eе3єεęėëê€é]',
		f: '[fғƒꜰ]',
		g: '[gɢ]',
		h: '[hн]',
		i: '[ıιi!1íĭǐîïḯịȉìỉȋīįᶖɨĩḭᴉᵢ¡İ|🕯ɪ]',
		k: '[kĸкḱǩķⱪꝃḳƙḵᶄꝁꝅʞκᴋ]',
		n: '[nηɴñń]',
		o: '[o○о0σõø🍪🥚°]',
		p: '[pр]',
		s: '[sş5$š]',
		ss: fast ? 'ss' : '(?:ss|ß)',
		t: `[${onlyLetterT}^7]`,
		u: '[υuúŭǔûṷüǘǚǜǖṳụűȕùủưứựừửữȗūṻųᶙůũṹṵᴜ]',
		x: '[xх]',
		ь: '[ьЪ]',
	};

	if (fast) {
		Object.keys(letter).forEach(key => {
			(letter as any)[key] = (letter as any)[key].replace(/[^\u0020-\u007e]/g, '');
		});
	}

	const anyD = '(?:d|\\|\\))';
	const anyH = '(?:h|\\|-\\|)';
	const anyK = '(?:k|\\|<)';
	const anyL = '(?:l|\\|_)';
	const anyN = '(?:n|\\|\\\\\\|)';
	const anyO = '(?:o|0|\\(\\))';
	const anyU = '(?:u|\\|_\\||\\\\/|\\(_\\))';

	const wordBreak = fast ? `[^a-zA-Z]` : wordBreakRU;
	const wordStart = `(?:^|${wordBreak})`;
	const wordEnd = `(?=$|${wordBreak})`;

	// sp
	const oó = fast ? 'o' : 'oó';

	// pr
	const ã = fast ? 'a' : 'aã';
	const á = fast ? 'a' : 'aá';

	// ro
	const ă = fast ? 'a' : 'aă';
	const ț = fast ? 't' : 'tț';

	// pl
	const ą = fast ? 'a' : 'aą';
	const ę = fast ? 'e' : 'eę';
	const ć = fast ? 'c' : 'cć';
	const ń = fast ? 'n' : 'nń';
	const ł = fast ? 'l' : 'lł';
	const ó = fast ? 'u' : 'uó';
	const ś = fast ? 's' : 'sś';

	function separeted(letters: string, separator = sep): string {
		return letters.split('').map(x => `${(letter as any)[x] || x}+`).join(`${separator}*`);
	}

	function baseSeparate(letters: string, sep: string, optional?: string) {
		return `_*${separeted(letters, sep)}${(optional ? `(?:${separeted(optional, sep)})?` : '')}_*`;
	}

	function separate(letters: string, optional?: string, separator = sep): string {
		return baseSeparate(letters, separator, optional);
	}

	function separate2(letters: string, optional?: string): string {
		return baseSeparate(letters, sep2, optional);
	}

	function alts(letters: string) {
		return letters.split('').map(x => `${(letter as any)[x] || x}+`).join('');
	}

	let fuckWords: string[];

	const badWords = [
		// english
		'aborted ?fetus',
		'all?(?:uh|ah ?u?a?|uah) ?a+c?k(?:ba+r*)?',
		'(?<!hea(?:r|w)ing|band) aids',
		'akbar',
		'anal(?:fisting)?',
		'(?:my|your|his|her)?a[*]?nus', // anus
		'i want uranus',
		'a n u s',
		'poopoo hole',
		'(?:b[i1]tch|fat)?a+[s$]{2,}(?:es|fucks?| ?w?holes?|hats?|lickers?|wipes?)?', // ass
		'arse? ?hole',
		'as[*]+ole',
		separate('asshole', 's'),
		'a[*]+h[o0]les?',
		'a+[sz2*$%#@&-]+h+oles?',
		'your a s s',
		'bootyhole',
		`a${sep2}?s${sep2}?s`,
		'a+ss+m+e+a+t+',
		'dumb a ss',
		'autis(?:ts?|ms?|tic)',
		'a *u *t *i *s *[mt]',
		'bend over',
		'bea?stiality',
		'lets bang',
		'bangs (?:her|him)',
		'son ?of(?: ?a)? ?(?:bitch|beach)', // bitch
		'beatch',
		'beach no',
		'you (beach|batch)',
		'bitv?c ?h',
		'b[%*]+ch',
		'b[i1][s$]h',
		'b[*]th',
		'b[*]{2,}s',
		`b(?:\\*|${letter.i})+[ae]*th?c+h+(?:e?[sz]+)?`,
		'b+i+t+s?c+h+',
		'bit?ach(?:es)?',
		'bit?<h(?:es)?',
		'b[it*]+ch(?:e[sz]+)?',
		'b+[i*]+c+t+h+',
		'b[hw]itch',
		'binch(?:es)?',
		'bio ?tch(?:e[sz])?',
		'(?:b|bi)[*]+(?:tch|ch|h)',
		'bi?y[ao]tch',
		'bi+ta+ch',
		'betch(?:es)?',
		'b *e +t *c +h',
		'b +i +o +t +c +h',
		'b-i-c-t-h',
		'b +i +c +t +h',
		'b\\.? *i *c\\.? *h',
		'biti?chi',
		'bit[sx]h',
		'bithc',
		'bitcj?',
		'bihtch',
		'b1ch',
		'bxitch',
		'(?:little|hi) b *e *a *c *h',
		`b${sep2}tch`,
		`b${sep3}{3,}h`,
		`b(?:${letter.i}|\\|)${letter.t}${letter.c}h`,
		'bi[ct] h',
		'bicht(?:es)?',
		'b[*]t[*]h',
		'b[*.]tch',
		'btc[*.]h',
		'bit[*.]h',
		'bi[*]{2}es',
		`b[i1]+s+h+(?:es)?`, // bish
		'b[*] sh',
		`b${sep2}+s+h+(?:es)?`,
		'b(?:ei|ic)tc+h+e?s?',
		separate('bitch', 'es', sep5),
		separate('bietch', 'es'),
		separate('bictch', 'es', sep5),
		`b${sep2}(?:i${sep2}|t)ch`,
		'(?:you little|son of a) b',
		'bi tc',
		'b[i!1][t+]ch(?:es)?',
		'bitces',
		'bi1?t1?ch',
		'b+i+c+h+',
		'b[i1l]tch',
		'b\\|7h',
		'b\\(\\S+\\)tch',
		'\\S*lilbetch\\S*',
		'(?:bl[o0]w|hoof|foot|hand|rim) ?jobs?',
		'boners?',
		'bone ?(?:me|you|him|her)',
		'b[o0]{2,}b(?:i+e+[sz]|ie|s|z| ?jobs?)', // boobs
		'b[o0]{2}b',
		'b[. ]+o[. ]+o[. ]+b(?: s)?',
		'butt ?plugs?',
		'put+ in the butt',
		'in the but+hole',
		'bukake',
		'ballsacks?', // balls
		'balls ?(?:deep|slapp?ing)',
		'(?:sweaty|his|lick my|empty my) ?balls',
		'my balls swell',
		'(?:butt|arse) ?holes?',
		'b[*]tthole',
		'(?<!died of )can[cs]er+(?:s|ous)?(?! patient)',
		'i hope you get (?:\\S+ )?cancer?', // cancer
		`(?<!died of )${separate('cancer')}(?! patient)`,
		'(?:horse|mare)?c\\Scks?(?! gun)', // cock
		'c[o0][c<]k(?:socks?)?',
		separate('cock'),
		'co[cq]ksuckers?',
		'c[o0][ck]c',
		`c${sep2}[ck]c`,
		'cockhead',
		'his cok',
		'condo[nm]', // condom
		'climaxe[ds]', // climax
		'(?:his|her|has a|hit my) climax',
		'clit(?:o[*]?ris)?',
		'clopp(?:ing|ers?)',
		'(?:whale)?cum+(?:s|ing|ies)',
		'cum ?(?:dump(?:sters?)?|buckets?|guzzl(?:ing|ers?)|soaken|stain|huge load)',
		//'cum', // cant use because of spanish
		'cum (?:in(?:side)?|on) (?:your?|my|me|her)',
		'cum (?:inside|outside|spewing|for me|harder|a ?lot|more|all|stain(?:s|ed)?|slave|on (?:yo)?ur|squirts|'
		+ 'fills|deep|massive)',
		'cum for(?!ç)',
		`(?:m[ey]|your?|i|h+is|warm|makes? u|me to|g[ou]nna|to not|more|make her|please|daddys|stallion`
		+ `|will|they|can|swallows|salty|of|some|with|licks?|leaks|pls|in|from|sticky|the|her|its|spurt(?:s|ing)`
		+ `|(?:going|start(?:ed|s)?|ready|about|get|want) (?:t-)?to|what|yes|did|don'?t|let'?s|say|i'?ll|zebra|and) cum`,
		'cum cum',
		'gonna c-cum',
		'i camm+e+',
		'c +u +m +(?:m +)+i +e +s',
		'cumme[rd]',
		'precum',
		'c(?:[*._-]n|u[*._-]|n[*])ts*', // cunt
		separate('cunt', 's'),
		'cunt(?:bo[iy]s?|lord|muffin|bags?)',
		`c${anyU}${anyN}t`,
		`c +${anyU} +${anyN} +t`,
		'c[.]unx?t',
		'cvnts?',
		'cxunt[sz]?',
		'(?:d[a4]dd?y|(?:bite|poke) me|do it) harder', // daddy/harder
		'(?:(?:duck|rut) ?me|harder|oh ?yes|s-so big) ?d[a4]dd?[yi]', // daddy
		'd[e3]{2}p ?throa[t7](?:ing|s|ed)?', // deepthroat
		`(?:horse)?d[i!](?:<|${letter.c})k+s?(?:wads?|suck(?:ing|ers?)?)?`, // dick
		'd[i*71!]+[c*]k+(?:les|face)?',
		'di\\[k',
		'dii+c+s?',
		'di+ +i+c+k+',
		'dic+s',
		'dicc+',
		'd[!?][(c]c',
		'dcks',
		'd[*] +ck',
		'di[ck]+ ?hea?ds?',
		separate('dick', 's'),
		separate('dicc', 's'),
		'limpdick',
		`di?${sep}c[ck](?:s|heads?)?`,
		`di?${sep}+ks`,
		'dick(?:girls?|hole)',
		'dikk',
		'd *l *c *k',
		'eat pee pee',
		'(?:your|my) d in (?:your|my) p',
		'suck (?:a|my) (?:d *i *c *k|d(?:ic)?)',
		'(?:my|your) di[ck]',
		'(?:my|your) d *e *k',
		'dildo(?:sa?)?', // dildo
		'dwildo',
		'd +i +l +d +o',
		'drink bleach',
		'do me hard',
		'ejaculat(?:e[sd]?|ing|ion)',
		'f[a*]p(?:p?ing)?', // fapping
		'f +a +p +p +i +n +g',
		separate('faps'),
		'foalcon',
		separate('fagot', 's'), // faggot
		separate('faggot', 's'),
		'fgt',
		'f ag',
		'dafag',
		'(?:normal|brony|furry?|gay|horse|pony|nigg?er)?f[a@]g(?:s|g?[0oi]t(?:s|ry)?)?',
		'f+a+g+s*',
		'f[ae]ggets?',
		'faguette',
		'fxaggots?',
		'fagatron',
		'fa[*]{2,}ots?',
		'f[a4][g69]{2,}[o0][t7]s',
		'fist( me|ing)',
		'fingering',
		...(fuckWords = [
			'shut ?the ?fuck ?up', // fuck
			'(?:f[*]+|f[uy]ck|fuq|fvk) ?(?:ed|ers?|ing|face|you+|off+|u+|me|up|urself)',
			separate('fucking'),
			separate('fuckin'),
			separate('fucker', 's'),
			separate('focker', 's'),
			separate('fvck'),
			separate('fucc'),
			separate('fack'),
			'f[u ]+[c ]+k',
			'facken',
			'fucc(?:e?n|d)',
			'f[a4]ck[e3]d',
			'f *u *c *c *s',
			'fu[#$%&_]+(?:ed|ing)',
			'f[#$%&_]cki[#$%&_]?ng',
			'fuack',
			'fuk+a',
			'fukwad',
			'dufuk',
			'fux{2,}g',
			'fxxx',
			'g[ie]t fuk[td]',
			'f[vu]+ck',
			'fk +(?:ing|o *f *f)',
			'f *k i *n *g',
			'f *u *k *i *n *g',
			'fu(?:[qk]s|vk|cj|kn)',
			'fkc',
			'fvkn?',
			'fvcc',
			'\\S*f[uv]<k(?:ing|er)',
			'ufck(?:ed|ing)?',
			'fuck\\S+',
			`f${sep2}+uck`,
			'f[*] +ck',
			'f ucj',
			'f-?uckie',
			'fuq[qk]ing?',
			'fuqk',
			'fuke up',
			'fukd',
			'fcng',
			'fwu[ac]k',
			'f x u x c x k',
			'fuchs',
			'f[ou]ke+n',
			'fakiu',
			'f- u',
			'f *_+ *(k|u|everyone)',
			'fu<k',
			'f[.\\[]u[.\\]]k(?:you|me)?',
			'uck m e',
			'fu[*_.,-]+ing',
			'the f (?:up|away|out)',
			'fukbo[iy]',
			'the(?:fuck|fuk|fuccin)',
			'fuke me',
			'fu[*\\[]king',
			`fu${sep2}?ccs?`,
			`fuc${sep2}ing`,
			'fu[0-9]ing',
			`f${sep3}+(?:ng|ing|ed)`,
			`f${anyU} ?ck`,
			'Fu *sh *ck *it',
			'f u [*] [*](?: i n g)?',
			'flu+ck(?:ing?|er|s)?',
			'flu+c?k(?:ing?|er|s)',
			'f *o *c *k *i *n *g',
			'fakk+(?:in|er)?',
			'f00k(?:in|er)?',
			'fy+c+king',
			'(?:faq|f\\.\\.k) *(?:ing|er|this|dis|u|you|yoursel(?:f|ves))',
			'(?:fyuck|fcuk)(?:ing|er)?',
			'(?:brony|furry?|gay|horse|pony|nigg?er|butt|mother ?|mo|mutha|da|de)?'
			+ 'f+[ou*8&%$#@]+[ck]+(?:ed|ers?|in[9g]?|able|faces?|balls?|toys?|ta+rds?|bo[iy]s?)?', // motherfucker
			'm[o0]therf\\S*',
			'm[uao](?:th|d)?af[au]c?k(?:as?|in)?',
			'moderfocke+r',
			'mothertrucker',
			'mother ?fukas',
			'm[aou]tha fu(?:kas?)?',
			'motha f',
			'mdfcka',
			'm[au]d[ai]f[au]c?kas?',
			'f+.?ck+(?:s|ed|er|ng|ing?|ign)?',
			'f.?u.?cking?',
			`f${sep}+cking`,
			`fu${sep2}+k`,
			'f[u*]\\[k(ing|er|s)?',
			`f${sep2}{2,}ing`,
			`f${sep2}{2,}g`,
			`f${anyU}k`,
			`f +${anyU} +k`,
			'fuc[k*]i(?:ng|gn)\\S+',
			'fuc(?:lk?|ken)',
			'foc(?:ki?-*ng?|uking)',
			'fuci(?:kn|nk)g',
			'fuxc*k(?:ing|er+)',
			'fxuck',
			'(?:mc)?f[zx]xk(?:er|ing)?',
			'fucvk(?:ing)?',
			'fuyck',
			'fuvkers?',
			'fuk+en',
			'fukign',
			'fooken',
			'fking?',
			'f+u+ic+k+',
			'(?:fac+|f-k) (?:me|you|him|her|them|off)',
			'fac{2,}',
			'(?:fk|f uk)(?:er|ing)',
			'fo+uo+co+k',
			'f[ _]*u[ _]*c[ _]*c[ _]?k?(?:me|you)?',
			'f *[^a-z ] *c *k(?: *e *r)?',
			'f[*]+[kgrd]',
			'(?:f+ ?k|ef+|fak|fek|fugk|fu|uck) (?:her|him|you|of+|out|me|urself|yourself)',
			'(?:e+f+|f+k+) u+',
			'f[u-]+ck(?:tard)?',
			'(?:phack|phuck?)(?:ers?)?',
			'f[.-]+ing',
			'fq(?:er|ing)',
			'(?:fak|fuq|fudge) (?:me|you|u)',
			'fa{2,}k',
			'(?:da)?fuqs?',
			'daf+u+q+',
			'f ?u [kq]',
			'f+a+c+k+',
			'f[_*]xk',
			'f[0-9*._]u[0-9*._]ck',
			'(?:go)?fukyou\\S*',
			'mcfuc[ck]ing?',
			'mother fu?',
			'what the fu?',
			'phcking?',
			separate('fucking', '', sep5),
			separate('fuced', '', sep5),
			separate('fock', '', sep5),
			`${separate('fuck', '', sep5)}(?:you|me|ed)?`,
			'f[^a-z ]+king',
			`f${anyU}${letter.c}k(s|ing|ed)?`,
			`f +${anyU} +${letter.c} +k(s|ing|ed)?`,
			'f[ .]+u[ .]+c',
			// `f +${anyU} +k +n`,
		]),
		'gang ?bang(?:ed|ing)?',
		'gtfo',
		'get(?:ting)? laid',
		'get \\S+ laid',
		'g-spot',
		'laid (?:me|you|her|him|them) hard',
		'lo[.]?lis?',
		`h *${letter.e} *n *t *${letter.a} *i`, // hentai
		'h+e+n+t+[b-z]?a+i+',
		'hentai[a-z]',
		'hen[*-]ai',
		'h[e*]nt[a*]i',
		'henta+i+(?:s+|heaven|hero|commie|tale)?',
		'h[ae4][i1]l ?h[i1]t+l(?:[e3]rs?|a)', // hail hitler
		'ha?i hitler',
		// `you(?:'re a)? hoes?`,
		`h${letter.o}[e3]s?`, // hoe
		`h[o0.]+${letter.e}s`, // hoes
		'h[o0]+kers?', // hooker
		'horn[*-]*y',
		'humps?(?: (?:me|you)|ing)',
		'i hope (?:your parents+|you|u) die',
		// 'go die',
		`(?:i${anyN}|self)c[e3]st(?:uous)?`, // incest
		'(?:jerk|j[a@]ck)(?:ing|s)? ?off',
		'j +e +r +k +(?:s|i +n +g) +o +f +f',
		'jerk(?:ing)? (?:you|u|him|them) off',
		'jizz(?:ed|ing)?',
		'jihad',
		'kikes', // jews
		'kys',
		`(?<!don'?t )k[i1] ?ll (?:ur|y[o0]u?r) ?s[e3]l(?:f|ves)`, // kill yourself
		'lub(?:ing|ed|e)',
		'marehood',
		'mast[ue]rbat(?:e[ds]?|ion|ing)?', // masturbation
		'm[a4][s5]turb(?:ar|o|en?)', // masturbo
		'm *a *s *t *u *r *b *a *t *e *[ss]',
		// 'milfs?',
		`m${anyO}an(?:s|ed|ing)?`, // moans
		'molest(?:ation|ing|ering?|ed|s|ia)?',
		'molistiah*',
		'(?<!grammar )nazi(?:sts?|sm|s)?',
		`(?<!grammar )${separate('nazi')}`,
		'necrophile?',
		// '(?<!ojos |son )negr[o0]s', // nigger
		'negr0s',
		'(?:black|stfu) negros?',
		'negros? (?:be|die|are|is|everywhere)',
		'negr[.]os',
		'n[1i!*]?[g3]{2,}[eo]r[sz]?',
		'n[1i!*](?:qg|gq)[e3]r[sz]?',
		'n[1i!*]gg?r?[e3](?:rs?|st)?',
		'niges+t+',
		`n[1i!*](?:ggr|g+ah?|${letter.b}{2}a)s?`,
		`ni${sep2}{2}a`,
		`n${sep2}(?:gg|bb)(?:as?|ers?)`,
		'n *i *g *g *e *s *t',
		'nigg[sy]',
		'niqqer',
		'niggurs?',
		'nig(?:ro|let)',
		separate('niger', 's'),
		separate('nigger', 's'),
		separate('nigga', 's'),
		`nig:[a-z]+:ger`,
		'ngigers?',
		'niggars?',
		'nigx?gx?ers?',
		'nyggas?',
		'neegah',
		'n[i1]bbers?',
		'n[i1][g69]{2,}([e3]r|a)s?',
		'n [i1|] b b a',
		'7igga',
		'niqqas?',
		'ni9{2,}ers?',
		'nig a',
		'nya?-?ggers?',
		'knee+gur+',
		'n0*i0*g0*g0*a',
		'normies+',
		'nudes',
		'oral',
		'orga[sz]m[so]?s?', // orgasm
		'urgazmo?z?',
		`o+r+g+(?:y+|ies|${letter.i}a)`, // orgy
		'piss(?:ing|face)?', // piss
		'p[e3*]n[i1][s$z](?:es)?', // penis
		separate('penis'),
		'p[e3]n[i1]s(?:[e3]h?s)?',
		'p[e3]{2,}ns?',
		'peepee',
		'peenus',
		'pengis',
		'penius',
		`b${letter.e}nis`,
		'pee(?:bnis|ner)',
		'p(?:ie|ea)ce of (?:shit|crap)',
		'pneis',
		'p[_*]nis',
		'(?:hard|surprise) ?penetration',
		'p[o0*]r[*]?no?', // porno
		'pr[o0]n',
		`${separate('porn')}${fast ? '' : '(?![ãÃóÓ])'}`,
		'(?:child )?pornogra(?:fia|phy)',
		'pound(?:ing)? (?:me|you|her|him|us)',
		'prostitut[ae]s?',
		'prostate',
		'(?:octo|horse|pony|wet)?(?!puss ?in ?boots)pu+[s$5]{2,}(?:y+|ies+)?(?:juice)?',
		'(?:horse|pony|boi)?pw?u[s$5]+(?:y|ies|i)(?:juice)?', // pussy
		'horsephssuy',
		separate('pussy'),
		`p${sep}ssy`,
		'p[_*][s$5]{2,}y',
		'pyssy',
		'pussy(?!cat|foot(?:ing)?)\\S+',
		'pu[s$_-]{2,}y',
		'pussa[hy]',
		`p${anyU}[s5]{2,}y`,
		'p[o0]{2,}s+ay',
		'pus{2,}i',
		'p[uv][sz$5]+y',
		'poo+ *s+y',
		'r[a@*]e?p(?:i[s$]ts?|ing|[e3](?:ists?|ing|s|d)?)', // rape
		separate('rapes'),
		separate('rape', 'd'),
		separate('rapist', 's'),
		'r/+p(?:ed?|ists?)',
		`r${sep2}pe[sd]?`,
		'r +a +p +i +n +g',
		`r${sep2}?a${sep2}?p${sep2}?e(?:s|d|ing)?`,
		'rhap(?:es|ed?|ist|ing)',
		'(?:eye|ass)rape',
		'raep',
		'r3pe',
		'(?:rap[*]|repe) +(?:yu|you|u|me|us|her|him|them)',
		'(?:wr|rw)ap(?:e|ists?)',
		'grape noises',
		'retard(?:s|ed|ads)?',
		separate('retard', 's'),
		'scr[e*]w(?:ing|ed)? (?:you|u|me|us|her|him|them|all)',
		'(?:[sz]ieg|s[ae]ig|[sz]ig) ?h[ae]il',
		'se[.]?men', // semen
		'sea ?men',
		'cmen',
		'send nu+des',
		'sex(?: *slave| *abuser?)',
		'(?:anal|butt|oral)?(?:[s$]ex+8?|secks|seks)', // sex
		'(?:anal|butt|oral) ?secs',
		's+[e3*&_]x+o*',
		's +[e*] +x',
		's *e *x',
		`${separate2('sex')}(?!${sep2}*y)`,
		'saex',
		'sexe',
		'have sax',
		'sexual(?:ly)?',
		'sax with e',
		'stf ?[uv]+', // stfu
		's +t +f +u+',
		'sc?hl?ongs?',
		'(?:my|his) shaft', // shaft
		'(?:bull|dip|oh|holy)?[s$]+h[i1*!]+e?t+(?:s|ing)?', // shit
		's[*]+i?t',
		`s[#■]it`,
		'(?:bull|dip)?shite(?! (?:iru|ageru|kudasai))',
		'shite?(?:heads?|faced?)',
		'shit(?:head|stain|lord)',
		's+h[ie#]t',
		's#{2,}t',
		'shjet',
		`sh${sep2}t`,
		`s${anyH}[i!|][t7]s?`,
		`s +${anyH} +[i!|] +[t7]s?`,
		'holy ?shee+t',
		'shitt+y',
		's[0-9]?h[0-9]?i[0-9]?t[0-9]?s?',
		'shxit',
		'shota',
		'sl[u#*]t(?:s|ty)?', // slut
		separate('slut', 's'),
		's(?:;l|l;)ut',
		's[*]ut',
		`s${anyL}${anyU}t`,
		's+p+e+r+m+a*', // sperm
		'spank me',
		'spicks',
		'spunk',
		'sucks? dic?k',
		'(c[o0]ck)?s *u *c *k(?:ing|er)', // sucks
		'c[o0]ck *s *u *c *k(?:ing|er)?',
		'sucks (?:balls|dic|harder|deeper)',
		`(?<!(?:it|that|this|which|school) )${separate('suck', 's', sep5)}(?! (?:(?:the )?blood|(?:(?:his|her|my|their) )?neck|at ))`,
		`${separate('succ', 's', sep5)}`, // succ
		'sukks?',
		'suk my',
		'su[(<\\[]k',
		's *[u*] *c *cs?',
		`s${anyU}+c{2,}s?`,
		`s\\|_\\|+c${anyK}s?`,
		`s${anyU}+c\\|<s?`,
		`s +${anyU} +< +ks?`,
		'su[c<]{2,}(?:ed|ing)',
		's[*]cks',
		'su+[i|]?[c<]ide', // suicide
		'suic[*]+de',
		'tampon',
		'testicles',
		'the kkk',
		`t[_ ]+${anyH}[_ ]+o[_ ]+t([_ ]+s)?`, // thots
		`t *\\|-\\| *[o0] *t`,
		'th0ts?',
		`th${sep}+ot`,
		'th:ots',
		'thotties',
		'sup thots?',
		'thrusts? into (?:her|him)',
		'tit(?:s|ty|ties?)', // tits titties
		't\\[i\\]i?ts',
		'tiddies',
		't i t s(?! [a-z] )',
		`t *${letter.i} *[td] *[td] *${letter.i} *e *s`,
		'tranny',
		'touch my d',
		'wank(?:ing|e+r[sz]?)?',
		'wh[o0*]re+s?', // whore
		'w\\Shore',
		'w *h *o *r *es?',
		'whorae',
		`w${anyH}${anyO}res?`,
		`w +${anyH} +${anyO} +r +es?`,
		'austic hore',
		separate('vagina', 's'),
		'v[*]gina',
		'vag[*]na',
		'vaginales',
		'vagina[a-z]',
		'vagin[ig]a',
		'(?:my|your|her) vag(?:ina)?',
		'[vb]aginal',
		'vagbo[iy]s?',
		'vibra[td]or(s|ima|om|es?)?', // vibrator
		`v${anyO}r(?:e[sd]?|ing)`, // vore
		'v[.-]?o[.-]?r[.-]?e',
		'vulva',
		'(?:white|wyte) ?(?:power|supremacy)',
		'yiff(?:s|ing|ed|ers?|u)?',
		'y i f f',
		'zo[o*]+(?:f|ph)ili(?:a+h?|cos)', // zoophilia
		// other
		'black ?supremacy',
		'(?:gas|kill)(?: (?:the|some|their))? jews?',
		'jews? burning',
		'x *v *i *d *e *o *s',
		'alt ?(?:[+-] ?)?f4',
		'(?:ctrl|control) ?[+-]? ?w',
		'touch +my +pp',
		'(?:my|your) dix',
		'(?:my|your) +p *p',
		'lick my pencil',
		'shoves? (?:my|your|his|her) horn into (?:me|you|him|her|them)',
		'rub my nipples?',

		// FOREIGN
		// bulgarian
		'nekoi hui', // some dick
		// dutch
		'hoer', // whore
		// portuguese
		'estupra',
		'filho da puta', // son of a bitch
		'caralho+', // fuck / dick
		'pu?ta madr?e', // motherfucker
		'p+[uv*]+t+a+[sh]?', // puta - whore
		'p[uv]+tazoh?', // puta
		`p${sep2}?u${sep2}?t${sep2}?ah*`,
		'p +u +t +a', // whore
		'p[v¡]to', // misspelled "puto"
		'putaria+', // whore
		'ptazos',
		'p+o+rr+a+', // fuck
		'vadia', // slut
		'malditos', // fucking
		'fud(?:er|ido)', // fuck
		'foda[ =-]?[sc]e+h?', // fuck
		'se fode',
		'f o d a - s e', // fuck
		'fodac?', // fuck
		'fodaci', // fuck
		'se fude(?:r|u)?', // fuck
		'm[e3]rdas?', // shit [it]
		`chupa+r? (?:me[ou]|minha|seu|su|mi) (?:p[${ã}4][ou]h?|rola|miembro|polla|pal)`, // suck my|your dick|member
		`chupa+r? *(tampones|pollas)`, // suck tampones
		'chupa(?:le|ndo) ?(?:la ?)?(?:tetas|punta)', // suck her tits | sucking the tip
		't3t4s', // tetas
		'chup(?:a|a[rs]|enle) ?(?:el ?)?(?:ano|orto)', // suck my ass
		`(?:lo )?chupa (?:a (?:minha|salsicha)|r[${á}]pido|entero)`, // suck my ... | sucks fast | sucks whole
		'chupale ?mejor', // suck him
		'chupamela', // suck me
		'lo chupa', // sucks him
		`chupando (?:a salsicha|forte|m[${á}]s fuerte)`, // sucking the sausage | sucking hard
		'meu pau', // my dick
		'soplame(?: el)?(?: pito)?', // blow my dick
		'sexo+',
		'penetra+ fort(?:e|ao)', // penetrates strongly
		'do pau dele', // his cock
		'cima do pau', // up the dick
		'tocar no pau', // touch the dick
		'lamber meu rabo', // lick my ass
		// spanish
		'ca[zx]{2,}[o0i]+', // shit / cocks
		'c[a*4]+r[a4]jo', // fuck
		'coje rejalo', // fuck you
		'c[o0]j[e3]r(?:conmi|h+)?', // cojer fuck
		'chingar?(?: tu madre)?', // fuck
		'chingados', // fucking
		`chup(?:o|ando) (?:fuerte )?tu pe[sz][${oó}]n`, // suck nipple / chupo
		'chupo con fuerza', // sucks hard
		'chupo(?: mas)? rapido', // sucks hard | sucks fast
		'sigue chupando', // keep sucking
		'cule(?:ro|ar)',
		'f[o0]ll[.]?[a4](?:r(?:[ms]eh?)?|mos|da|s)?', // fuck me / follarme
		'gilipollas', // douchebag
		'hij[ao]s? de? pt[ao]',
		'inbesil',
		'jop[uv]tas',
		'j[o0]d[a4]+s', // jodas / fuck
		'j[o0]d[e3a4]r', // joder / fuck
		'j[o0]dier[o0]n', // they fucked
		'mi[e3]rda+h*', // fuck / shit
		'tu miembro', // your member
		'mrda', // shit
		'matate', // kill yourself
		'mereces morir', // you deserve to die
		'n[oi] mereces vivir', // you do not deserve to live
		'n[e3]pes?h*', // penis / nepe
		'maric[o0]n', // maricon
		'p[uvw#*.]t[ao][zhs]*', // fucking puta / puto
		'pollas', // cocks
		'pvtaso',
		'pu[.]?t[ao]', // fucking
		'puti[.]?ta', // bitch,
		'p[uv]t[a4](madre|kos)',
		'p[t7][ao]', // puta
		'pij[.]?a', // prick
		'se le corre', // cums
		'sou foda', // I'm fucking
		'suicidat', // commit suicide
		'violando(?! la)', // raping
		`v1${letter.o}l[eo]`, // violo / viole
		`[vb][i1]${letter.o}l[a4]r`, // rapes
		`vi0lare`, // rapes
		`[vb]1${letter.o}laci${letter.o}nes`, // violaciones
		'violo a', // raped
		'la viole', // raped
		'la mete', // puts it in
		'lamer la punta', // lick the tip
		'[bv]ete ?a ?la ?[bv]erga?', // fuck off
		'v[e3]?rga', // cock
		'zemen+', // semen
		'zorra', // bitch
		// italian
		'arrap(?:at[eiao]|ano|are|[oi])', // horny
		'bagasci[ae]',
		'baldracc(?:a|he)', // whore
		'bastard[eiao]', // bastards
		'bocchin(?:[io]|ar[ae])', // suckers
		'bordello',
		'butt[ao]n[ae]', // bitch
		'cagna', // bitch
		'cagare', // shitting
		'k[a4]g[a4]r', // cagar / shit
		'caghi(?:amo)?',
		'caga(?:no|te)', // crap
		'cazz(?:on[iae]|at[ea])', // cocks
		'checc(?:a|he)', // queers
		'chiav(?:o|are)', // screw
		'chia?[bv]at[ae]', // fucked
		'c[o0]glion[aie]',
		'cortigian[ae]', // courtesans
		'culatton[ie]',
		'ditalin[io]', // fingering
		'ebet[ie]', // stupid
		'eiacul(?:i|o|are|azione)', // ejaculation
		'(?:vaf)?fanculo', // fuck
		'fanculizzati',
		'fotte(?:te[lvm]i|re)', // fuck you
		'fott[io](?:[tm]i|l[oaie])?', // fuck
		'fottut[aeio]', // fucking
		'frocio?', // fags
		'fregna', // cunt
		'gigolo',
		'gnocc(?:he|a)', // chicks
		'handicappat[aeio]', // disabled (insult)
		'la figa', // pussy
		'negraccio', // nigger
		'perra+', // bitch
		'pirla', // idiot
		'p[e3]l[o0][t7]ud(a|o|ito)', // asshole
		'p[e3]?n[.]?dej(a+|o+h?s?)', // stupid | pendejo
		'p[e3]nej(a+|o+h?s?)',
		'poll[.]*as', // dicks
		// 'porco', // pig
		'pompin(?:[io]|ar[ieao])', // blowjob
		'puth?[o0]s*', // fucking
		'putada', // bitch
		'puttan(?:[ae]+s?|at[ae])', // whore
		'prostitu(?:irsi|zione)', // prostitution
		'scopa(?:ndo|mi)', // fucking
		'incazza(?:t[aeio]|rsi)', // pissed
		'incul(?:o|i(?:amo)?|a(?:rti|li|lo|la|no|te|re)?)', // pounding your butt
		'lecc(?:hin[io]|acul[io])',
		'masturb(?:[ai]h?|alo|ami|are|arsi|azione|ate(?:li|vi)|iamol[oi]|iamoci|ando|as)', // masturbation
		'merdos[ao]', // shitty
		'meretric[ie]', // harlots
		'mignott[ae]', // whore
		'minchi(?:[ae]|at[ae]|on[iea])', // bullshit
		'masturbarmi', // masturbation
		'rompi(?:palle|coglioni)',
		'ricchion[ie]',
		'rincoglionit[ieao]',
		'sborr(?:o|a|ano|ate|i|iamo|are)', // cum
		'sburro',
		'scopal[ao]',
		'scopar[tm]i',
		'scassacazz[io]',
		'sesso+', // sex
		'sessuale',
		'segaiol[io]',
		'sfott(?:[io]|ere)',
		'sgualdrin[ae]', // whore
		'spomipina',
		'spompina(no|re)',
		'stupratore', // rapist
		'sputtan[ai](?:l[io]|no|amo|t[aeio]|re)?',
		'sputtaniamol[oi]',
		'stronz[eaio]',
		'stronzat[ae]',
		'stupro', // rape
		'zoccol[ae]', // bitch
		'(?<!la )pene', // penis (also in spanish)
		'el pne',
		'vagine', // vagina
		'troi[ae](?:io|h)?', // slut
		'trombare',
		'tromb[io]',
		'trombate',
		'trombano',
		'trombal[ao]', // ???
		'trombiamo(?:l[eiao])?', // ???
		// 'fica', // pussy
		// finnish
		'perkele', // fuck
		'vittu', // fuck
		// french
		'(?:fils de )?pute', // (son of a) bitch
		'pute(?:u+h+)?', // bitch
		'merde', // shit
		// sweedish
		'fitta', // pussy
		// german
		'arsch', // ass
		'fotzen?', // cunt
		`schei${letter.ss}\\S+`, // shit
		'(?:[gb]e)?schissen', // shit
		'(?:[gb]e)?(?:wichs|kack|fick)(?:est|en|et|e|test|te|t|st)',
		'(?:[gb]e)?(?:piss)(?:est|en|et|test|te)',
		`hurens(?:oe|[${fast ? 'o' : 'öo'}])hne?`, // son of bitch
		'huren', // bitch
		'schlampen?', // bitch
		'schwuchteln?', // faggot
		'neger', // nigger
		'wichser?', // fucker / cum
		'wixxer?', // fucker / cum
		'verpiss ?dich', // fuck off
		'verdammter', // fucking
		'm[ea]in ?kampf',
		'lutsch meinen schwanz', // suck my dick
		// other
		'9/11',
		// sexually suggestive
		'against (?:her|his|your) insides',
		'creamy load',
		'empty my load',
		'cherry got popped',
		'into (?:her|your) (?:cervix|uterus)',
		'tight cervix',
		'(?:my|his|her|your) crotch',
		'panting heav(?:il)?y',
		'pegs her',
		'penetrat(?:es?|ing) (?:him|her|you|your)',
		'put(?:s|t?ing) (?:it|that) in (?:your|my|his|her) mouth',
		'pounds? (?:against|her|deeper)',
		'pump(?:ing)? my (?:large )?(?:seed|load)',
		'pushes (?:my tongue|deeper inside)',
		'pushing deep',
		'prodding my tip',
		'gets it inside',
		'goes (?:harder and |in )?deeper',
		'groans and th?rusts',
		'grabs her breasts?',
		'grinding her',
		'(?:starts|keeps|begins) thrusting',
		'thrusting (?:her|his|him|(?:even )?harder)',
		'thrusts? (?:slightly )?(?:deep|hard)(?:er)?',
		'thrusts? (?:my tongue|against)',
		'tongue inside',
		'(?:thick|my) hot load',
		'thick and creamy',
		'tight walls',
		'fast and (?:hard|deep)',
		'forcing every inch inside',
		'hard and deep',
		'her slit',
		'(?:her|his) nether regions?',
		'faster and (?:deeper|harder)',
		'fully erect',
		'deeper and harder',
		'harder and (?:harder|faster|rougher|deeper)',
		'filling her up',
		'(?:his|my) knot',
		'(?:her|your) (?:wombs?|wet cave|wet tunnel)',
		'her plothole',
		'kisses (?:him|her) lewdly',
		'womb with his',
		'(?:he|gently) thrusts',
		'(?:sticky )?(?:hot|warm) loads?',
		'hot seed',
		'seed into her',
		'mare juices?',
		'milk(?:ed|ing) him',
		'my fluids',
		'makes (?:you|u) squirt',
		'(?:his|your|my) (?:huge )?member',
		'pushes member (?:inside|into her)',
		'inside of her(?! mind)',
		`(?<!hold me |hugs |it'?s )so tight`,
		'fingers (?:inside )?her',
		'release my (?:heavy )?load',
		'rubs? her area',
		'screams in pleasure',
		'slides it in and out',
		'shoves (?:my tongue|the rest in)',
		'shoots out jizz?',
		'starts? (?:pounding|thrusting)',
		'sticks tongue in',
		'squirts on (?:your|his|her) face',
		'spreads her legs',
		'spraying (?:your|his|her) insides',
		't-tight',
		'tailhole',
		'throbbing hard',
		'with each thrust',
		'your dirty hole',
		`you're so wet`,
		// russian
		'pidor[sy]?', // faggot
		'pizdec+\\S?',
		'huinya',
		'kurva', // bitch
		'blyad', // bitch
		'bliat', // fuck
	];

	const badWordsForeign = [
		// romanian
		`suga ?pul[${ă}]`, // suck dick
		'muie', // blowjob
		`s[${ă}] ?te ?fut`, // fuck you
		`futu-?[${ț}]i ?pizda`, // fuck your pussy
		...(fast ? [] : [
			'pulă', // dick
		]),
		// polish
		`ci+p(?:a{2,}|ę|ą|k(?:ami|[${ą}]|[${ę}]|i|owate|o)|ek|eczka|usie[${ń}]ka|ule[${ń}]ka)`, // pussy
		'chu{2,}j', // dick
		'chuj(?:u|ek?|ami|a)', // dicks
		'(?:ten|w) chuj|chuj wie', // fuck
		'c?huj (?:ci|wam|w dupe)(?: w dupe)?', // fuck you
		'c *h *u *j *[eua]',
		'huj[aeu]', // dick
		'huj ?pizda', // dick cunt
		'cycki', // boobs
		// 'debil(?:[aie]|ami|em)?',
		'kutas(?:y|ami|iarzu?)?', // dick
		'pornosy?', // porn
		`dziwk(?:ami|om|[${ą}${ę}io])`, // bitch
		`k[.*]+rwa`, // bitch
		`kurwa ?ma[${ć}]`, // bitch
		`k *u *r *w *a(?: m a [${ć}])?`, // bitch
		`k[${ó}]+r[w*](?:ie|ami|y+|[${ę}]+|[${ą}]+|om|o+)x*`, // bitch
		`ku${sep2OrNum}+r?w(a+|o+)`, // bitch
		'ku[*]{2,}a+', // bitch
		separate('kurwa'), // bitch
		`wkurwi[${ł}][ay]?`, // bitch
		`wkurwia*(?:sz|my?|j[${ą}]?|[${ć}])?`, // bitch
		'skurwiel(?:em?|ami|i|a)?',
		`pi[z*]d[${ą}${ă}${ę}y]`, // cunt (also romanian)
		`(?:roz|ja|s|wy?)?pierd[o*]l(?:[${ę}]|i?cie|isz|i[${ł}](?:[ao]|[ae][${ś}])|i[${ć}]|eni|e|on[eay]| si[${ę}])?`, // fuck
		`roz[*]+ba[${ć}]`,
		`(?:s|za|wy?)pier?(?:[d*]a|[da*])la(?:jcie|j[${ą}]?|my?|cie|[${ć}])?`, // fuck
		`(?:s|za|wy?)pieprza(j|[${ć}]|j[${ą}]|jmy)`, // fuck
		`z?g[wf]a[u${ł}](?:t|tem|ty|tów|tami|cenie?|ceni|con[aey]|c[eoąi]|[${ć}]my|ci[${ć}]|ci[${ł}]+[iay]|cimy?)`, // rape
		'(?:za|wy|z|u|na|prze|po|roz|przy)?'
		+ `je+[b*](?:ie(?:sz|my)?|i[${ą}]|a+[*]?n[yaei]+(?:mi|m|go)?|a[${ł}][aeiyo][m${ś}]?|a+[${ć}${ł}]|a[${ń}]ce)`, // fuck
		`jeb(?: ma[${ł}]e)? dzieci`,
		`(?:wy)?r${sep2OrNum}*ucha(?:my?|jmy|jcie|j[${ą}]?|[${ć}]|nym?|n[ae]|nie?)`, // fucks
		'peda(?:le|lsk(?:ie|im|i|a)?)', // fag
		...(fast ? [] : [
			`pe[d*]ał(?:y|a|em|ami|[${ó}*]w)?`, // fag
			'gówn(?:o|a|iaki?)', // shit
			'suką+', // bitch
			'żesz chuj', // oh fuck
			'fapać', // fap
		]),
		's *p *i *e *r *d *a *l *a *j', // fuck off
		'p *i *e *r *d *o *l *e', // fuck
		'j *e *b *a *n *[aeyi]', // fucking
		'p *i *e *p *r *z *s *i *e', // fuck you
		`g *w *a *[${ł}] *t`, // rape
		'fapie', // fap
		`zabij ?si[${ę}]`, // kys
		`wejd[${ę}] w ciebie`, // I'll penetrate you
		`w dup[${ę}]`, // in the ass
		'morda psie', // shut the fuck up
		's[.]*u[.]*k+aa+', // bitch
		's[.]*u[.]*k[.]*k+a+', // bitch
		'su ka', // bitch
		// spanish
		...(fast ? [] : [
			'coño+', // pussy
		]),
		// czech
		...(fast ? [] : [
			'srát', // shit
			'piča', // cunt
		]),
		// turkish
		'sikiyimmi(?: seni)?', // fuck
		...(fast ? [] : [
			'göt(?: ?k[ıI]l[ıI]| ?veren)?', // ass (hole, giver)
			'orospu(?: ?çocuğu)?', // bitch (son of a)
			'(?:anan[ıI] ?|ecdad[ıI]n[ıI] ?)?sikiyim', // fuck
			'ana?nı sikim', // fuck
			'am[ıI]na ?koyayim', // fuck
			'amc[ıI]k', // cunt
			'yarra[ğg][ıI]m[ıI](?: ?ye)?', // eat my dick
			'sikiş', // porn
		]),
		'seni ?sikerim', // fuck
		'sikiyim', // fuck
		'siktir(?: ?git)?', // fuck
		'yarrak(?: ?kafa)?', // dick (head)
		'orospu', // bitch
		// russian
		'cy[k*]a ?(?:bl(?:ye|a|ie+)t+|bylat|blyt|blayt|bl[*]at)', // fuck bitch
		'[sc][uy]ka ?bl[yiue]*?a[td]?', // fuck bitch
		'b-?l-?y-?a-?d',
		'pisda', // cunt
		'bly+a+t+', // fuck
		'blya{3,}', // fuck
		'c[*]{2,}a', // bitch
		'cykablye+t',
		'cykaxd+',
		'cyak ?blyat',
		'ckya', // bitch
		separate('blyat'), // fuck
		separate('cyka'),
		'(?:cyka)+',
		'c ?ica blia', // cyka blyat misspelled
		'govno+', // shit
		...(fast ? [] : [
			'б/?\\\\yat',
			'суда вручат', // cyka blyat misspelled
			'анал(?:ьные)?', // anal
			'а +н +а +л',
			'бля(?:ть)?ъ', // fuck
			`(?!бл ять|б лять)${separate('блять')}э?`,
			'[cс][yу][0-9]*[kк][aа]+',
			separate('сука'), // cyka
			'су\\dка',
			'су[57]+а',
			`с${sep2}+ч?ка|су${sep2}+а|сук${sep2.replace(/[.,!?"'()]/g, '')}+`, // bitch
			'[сc][*]{2,}[аa]', // bitch
			'с[*]{3,}', // bitch
			'сцука+', // cyka (misspelled)
			'Сюка', // bitch
			'[*]+ка', // bitch
			'с+у+к+и+н?', // bitch
			'сук[оo0]+', // bitch
			'секс(?:ам|а+|е|у|ом)?', // sex
			'срать', // crap
			`(?:вы|по)?е[б6]+[*]?(?:у|учая|ётесь|а?ться|а+т[ьъ]+|ало?м?ъ?|на|ались|аные|ан+ая|[*])`, // fuck
			`(?:вы|по)?е[б6]+${sep2}(?:у|тесь|ться|ть|лись|ные|н+ая|чий|чие)`, // fuck
			'е[б6]етс', // fucks
			'я *ебаl', // fucked
			'выепать', // fuck
			'влагалища', // vagina
			'вибратора?', // vibrator
			`е${sep2}?[б6]${sep2}?[ёуа]${sep2}?ть?`, // fucks
			'е[б6](?:ать?ся+|ёнок|.ть|анный|алом?ъ?|нулся|нутая|анутся)', // fuck
			'з[б6]ать', // fuck
			'бл[*]{2,}ь', // whore
			'б[л*]я(?:.ь|[яа]*)', // whore
			'(?:е|лэ)?б+[лl]+[я*]+(?:ч|т+ь+э?|т+б*|дина|ди|дь|дя)?', // fuck / whore
			`б(?:л${sep2}|${sep2}я+|${sep2}{2})ть`, // whore
			'бл[эая]ть', // whore
			'б[*]+[ья]+', // whore
			'зае[б6](али?|лся)', // fucked
			'з[*]ебуьс',
			'е[б6]а', // fuck
			'е[*]б',
			separate2('заебал'), // whore
			separate2('бля'), // whore
			'з[а_*]еб[а_*]ли?', // whore
			'б *л *я', // whore
			'вы[*]+', // fuck
			'говно+м?', // shit
			'мать твою', // fuck
			'онанист', // onanist
			'орг(?:ия|азм)', // orgy/orgasm
			'охуительны(х|е)', // fucking
			'о[б6]осса(на|ть)', // pee on somebody
			'шалаву', // slut
			`ш${sep2}?л${sep2}?ю${sep2}?(шк[аa]+|[хx]и|[хx][аa]+)`, // slut / whore
			'ш +л +ю +(ш +к +а|х +[иа])', // slut
			'шл[_*]ха', // slut
			'пенис', // penis
			'потрахались', // have sex
			'тр[а@*]х(атьс(еб)?я|аьт|нула|алаъ)', // fuck
			'дрочить', // masturbate
			'порнухой', // porn
			'изн[ак]силую', // rape
			`у?пи[*]?[3з${emoji}]+д(?:абол(?:ка?)?|ое[б6]+учий|овать|овал|олизка|ы|а|ецъ?|е|юк|уйте|уй|ос?)`, // cunt / pussy
			'п[_*]здец', // pussy
			`письки`, // pussy
			'киск[иеуа]', // pussy
			'сперму', // sperm
			'кончи(?:л|шь)', // cum/cumshot
			'пид[о0]+р(ы|а[зс])?', // fag
			`п${sep2}здуй`,
			'ниггеров', // niggers
			'мудак[аи]?', // asshole
			'лохи', // fuckers
			'соси писос', // suck dick
			'сосу член', // suck dick
			'члено(?:м|соса?)', // cock/cocksucker
			'(?:иди)?на[хx]уй', // fuck
			`[хx]${sep}ль`, // fuck
			'[хx]ерню', // garbage
			'(?:н[аa])?[хx][уy*]+[йи]+(?:ло|ка|э|у+|ъ+|н[ёе]й|н[юя]?)?', // garbage / prick / fucking // наxyй
			'н[.]*а[.]*х[.]*у[.]*[йи]',
			'(?:ху[йя])+', // fuck / dick
			'ху[\\\\/]*ли', // fuck
			'х[_.*]ли', // fuck
			`ху${sep}+[йи]`,
			`[хx]+${sep}?у+${sep}?[йия]+${sep}?у*`,
			`[хx][${emoji}](?:[йия]|ёв)`,
			`[хx]у[${emoji}]`,
			`на(?:${sep2}у|х${sep2})[йи]`,
			'(?:ни|на|ha)?хер(?:а|ней)?', // dick / fuck
			`(?:по|идина)?х(?:у|${sep2})[йию](?:ло|лестия)?`, // dick
			'(?:по|на)\\)\\(у[йию]', // dick
			'мастурбация', // masturbation
			`[хx] *${sep2}+ *у *${sep2}+ *й`,
			`п(?:а|${sep2})дика`, // fagot
			'насил(?:ьник|уют)', // rapist
			'ни[хx]уя', // fucking
			'на[*]+й', // dick
			'н[*]{3,}й', // dick
			'насрать', // shit
			'дерьмо', // shit
			'дебилы?', // moron
			'ты еб', // you fuck
			// 'дохуя', // f*cking much (shitload)
			'\\bхуе\\b', // dick
			'за(?:сранец|лупа|дницу)', // dickhead / ass
			'гавном?', // shit
			`т${sep2}?р${sep2}?а+${sep2}?[хx](?:ни(?:те)?|нуть|ну|ает|а+ть)?(?: (?:тебя|меня))?`, // poke / fuck (you|me)
			'жоп(?:у|ай?)', // ass(hole)
			`про[е${emoji}]бал(?:ся)?`, // fucked
			'анал', // anal
			'3===+э',
			'зиг ха[ий]?ль', // seig hail
			'(?:на|г|б)[*]{2,}',
			'(?:наша|нас|моя|моей) ?(?:территори[яи]|терра)', // our|my territory
			'кунт', // cunt (phonetic)
			'х[*]{2,}',
			'[Ъb][*іi][тt][cc][нh]', // bitch
			`\\)\\(${sep}?у+${sep}?[йия]+${sep}?у*`,
			'fuск\\S*',
		]),
		// en
		'b[i!]tc\\|-\\|',
		'di(?:l|\\|_)d(?:o|\\(\\))', // dildo
		'(?<!grammar )n[a4]z[i1]s?', // nazi
		'fu[*-]{2}',
		'sh[*-]{2}',
		'wh[o0]r3s?',
		'\\*{4}(?:ed|ing)',
		'\\|\\\\\\| *[i1] *[g9] *[g9] *e *rs?', // nigger
		'[$]+(?:hit|perm|luts?|uck(?:ing)?|ex)',
		'tit',
		'[a@]+[s$]{2,}',
		'pi[$]{2,}',
		'[abcdfsn][*#]{2,}',
		'bit?[*]{2,}',
		'fu[*]+',
		'bic[*]+',
		'\\*+(?:ck)?ing',
		'(?<!-)se[*]',
		'(?:di|sh|ra|bi)[*]{2,}',
		'\\*sshole',
		'\\*{3}hole',
		`\\/\\|\\/iggers?`,
		'su\\(\\(',
		'd[i!1](?:\\(\\(|\\|<)',
		`c${anyO}c\\|<`,
		'f[o0][ck]\\(',
		'f[o0]\\([ck]',
		'f [o0] \\( [ck]',
		`${letter.c}${letter.o}${letter.c}${letter.k}`, // cock
		`w${letter.h}${letter.o}r${letter.e}`, // whore
		// japanese
		'ファックユー?',
	];

	const badWordsOther = [
		'👉👌',
		'sexoanal',
		'masturbar',
		'cykably[ae]t',
		'autists?\\b',
		'bitch',
		'pussy(?!cat|foot(?:ing)?)',
		'nastyhoe',
		'(?:^| )irape',
		'rapechild',
		'ifinger',
		'^negros[.!?]*$', // nigger
		'f[a@]+[g3]+[eou0i]ts?\\b', // faggot
		'fags?\\b',
		'\\bfag(?:g|o)ot',
		`${alts('fuck')}(?:${alts('ing')}|${alts('er')}s?)?`, // fuck
		'\\bfuk(?:you|ass|of+)', // fuck
		'f[au]ck(?:er[sz]?|ing)',
		'fuking',
		'fvkin',
		'fvck',
		'fu(?:ck|kc)',
		'f +u +c *k',
		'^a s s$', // ass
		'fukin',
		'[*]+exual', // sexual
		'(?:^| )ʞɔnɟ(?: |$)', // fuck
		'(?:^| )[aα]ss(?: |$)', // anal
		'(?:^| )[a4]n[a4]l(?: |$)', // anal
		'^beaches$', // bitch
		`(?:^| )b *[i!] *t *c *${anyH}(?: |$)`, // bitch
		`(?:^| )f *${anyU} *${letter.c} *${anyK}(?: |$)`, // fuck
		'(?:^| )fv\\|<(?: |$)', // fv|<
		'(?:^| )fu[#&%_]{2,}(?: |$)', // fu??
		'(?:^| )fu\\[\\|<(?:ing|er)?(?: |$)', // fu[|<
		`${separate('fuck', 's')}`,
		'(?:^| )cum~+(?: |$)', // cum
		'(?:^| )[*]+cum[*]+(?: |$)', // cum
		'(?:^| )dild0\\d*(?: |$)', // dildo
		`(?:^| )${alts('cunt')}(?: |$)`, // cunt
		`(?:^| )${alts('tits')}(?: |$)`, // tits
		`(?:^| )${alts('bitch')}(?: |$)`, // bitch
		`(?:^| )${alts('penis')}(?: |$)`, // penis
		`(?:^| )${alts('nigga')}(?: |$)`, // nigga
		`(?:^| )${alts('nigger')}(?: |$)`, // nigger
		'(?:^| )n[i1][g69]{2,}[a4][s5]?(?: |$)', // nigga
		`(?:^| )\\|\\\\\\|az[i|]s?(?: |$)`, // nazi
		`(?:^| )\\|-\\|e${anyN}ta[i|](?: |$)`, // hentai
		`(?:^| )\\$${anyH}it(?: |$)`, // shit
		`(?:^| )sh[i1!][+](?: |$)`, // shit
		`(?:^| )👃unts?(?: |$)`, // cunt
		`(?:^| )d${letter.i}${letter.c}${letter.k}(?: |$)`, // dick
		`(?:^| )${anyD}[i1][c(]k[s$]?(?: |$)`, // dick
		`(?:^| )stf${anyU}(?: |$)`, // stfu
		`(?:^| )s +t +f +${anyU}(?: |$)`, // stfu
		`(?:^| )\\$hithead(?: |$)`, // shithead
		`(?:^| )${letter.s}${letter.e}${letter.x}(?: |$)`, // sex
		`(?:^| )${letter.p}${letter.o}r${letter.n}(?: |$)`, // porn
		`(?:^| )p${letter.o}rn${letter.o}+h*(?: |$)`, // porno
		`(?:^| )p[*]rn${letter.o}+(?: |$)`, // porno
		'(?:^| )l[o0]l[i1](s|x|cons?)?(?: |$)', // loli
		'(?:^| )[*]humps[*](?: |$)',
		`(?:^| )${letter.o}+r+g+(?:y+|ies|${letter.i}[a4])(?: |$)`, // orgy / orgia
		`(?:^| )${letter.o}rg${letter.a}sm(?: |$)`, // orgasm
		`(?:^| )${letter.o}v[e3]r?s[e3]x[e3]d(?: |$)`, // oversexed
		`(?:^| )${letter.o}r4l(?: |$)`, // oral
		`(?:^| )h[e*]nt[a*][i1](?: |$)`, // hentai
		`suckmydick`, // suck my dick
		'^(?:(?:sup|hi|hey|you) )?botch[!.]*$',
		// spanish
		'(?:^| )an[0○](?: |$)', // ano
		'(?:^| )(?:ort0|0r[t7][o0])(?: |$)', // orto
		'(?:^| )m[i1][e3]rd4(?: |$)', // mierda
		'(?:^| )mi?er[d#][#]+(?: |$)', // mierda / merda
		'(?:^| )maric[a4](?: |$)', // marica
		'(?:^| )c[a*4]+r[a4]j[o0](?: |$)', // carajo
		'(?:^| )caralh[0#](?: |$)', // caralho
		'(?:^| )put[04#]+[sh]*(?: |$)', // puta put0
		`(?:^| )p${letter.u}t${letter.a}(?: |$)`, // puta
		`(?:^| )pu[*]{2}(?: |$)`, // puta
		`(?:^| )p[vw]t${letter.o}(?: |$)`, // puta / pvto
		`(?:^| )pvt${letter.a}[s!]?(?: |$)`, // puta
		`(?:^| )pvt${letter.a}s[o0]s(?: |$)`, // puta
		`(?:^| )-*pv?t${letter.a}z[o0]h?-*(?: |$)`, // puta
		'(?:^| )p[t7][@0](?: |$)', // puta
		'(?:^| )(?:chupa(?:r|me) la )?p[i1]j4h?(?: |$)', // pija
		'(?:^| )p[e3]?nd[e3]j0[sz]?(?: |$)', // pendejo
		'(?:^| )(p4j[a4]|paj4)(?: |$)', // paja
		'(?:^| )p[e3€]n[3€]h*(?: |$)', // pene
		'(?:^| )p[3€]n[e3€]h*(?: |$)', // pene
		'(?:^| )porr[@#](?: |$)', // porra
		'(?:^| )su<<(?: |$)', // succ
		'(?:^| )fod[4@#](?: |$)', // foda
		'(?:^| )c[o0]ñ[o0](?: |$)', // cono
		'(?:^| )cul[o0](?: |$)', // ass
		'(?:^| )n[e3]p3(?: |$)', // nepe
		'(?:^| )a[_]?[s$5]{2}(?: |$)', // ass
		'(?:^| )\\/\\\\[s$]{2}(?: |$)', // ass /\$$
		'(?:^| )\\+turbar(?: |$)', // +turbar (masturbar)
		'(?:^| )kg4rl4(?: |$)', // cagarla // fuck it up
		'(?:^| )[*]viola[*]?(?: |$)', // *rapes*
		'(?:^| )v[e3]?rg[a4](?: |$)', // verga / berga // cock
		'(?:^| )b[e3]?rg4(?: |$)', // verga / berga // cock
		`(?:^| )[vb][i1]${letter.o}l[03](?: |$)`, // violo / viole
		`(?:^| )s${letter.e}x${letter.o}(?: |$)`, // sexo
		'(?:^| )p[e3]l[o0][t7]ud0(?: |$)', // asshole
		'(?:^| )j[o0]d[e3]t[e3](?: |$)', // jodete / fuck
		'suicidate', // commit suicide
		// portuguese
		'^[* ]*chupando[* ]*$', // sucking
		...(fast ? [] : [
			'(?:^| )6+ля(?: |$)', // fuck
			'(?:^| )6лять(?: |$)', // fuck
			'(?<!бар)с+[у*]+ч*к+а+', // bitch (except: барсука // badger)
		]),
		'(?:^| )fu[(|]<(?:ing)?(?: |$)', // fu(< fu|< fu|<ing
		`(?:^| )${alts('nigger')}(?: |$)`, // nigger
		`(?:^|^${sep4} ?|\\S\\S | U )f+ +(?:her|him|you|of+|out|me|urself|yourself|everyone|admins|mods|moderators|my life|harder)\\b`,
		`(?:^|[ \\(\\)\\{\\}\\]\\[:;!|\`"@#$%^&*,._=+~\\-])(?!(?:s+hh+|ss+h)[ .,!-]+it)${separate('shit', 's')}\\b`,
		'(?:^| )[a][*#]{2}( |$)',
		'\\bbi.ch\\b(?! tree)', // bitch
		'\\bc+[y*]+u*k+a+\\b', // bitch
		'^cum$', // cum
		'^fu?[*]+(?: |$)', // f* fu*
		' fu?[*]+ ', // f* fu*
		'[a-z]{2,} f+[*]* +u+$', // just f u (avoid matching "o f u")
		'\\bf{2,}[*]* +u+$', // fffff u
		'^f+[*]* +u+(?= +[^a-z ])', // f u
		'^f+[*]* +u+(?! *s *i *o *n)(?= +[a-z][a-z]+)', // f u
		'^f+[*]* +u+$', // f u
		'^f u c$',
		'^fak$',
		`(?:^| )${sep3}{2,} *(?:uck+(?:ing)?|itch)(?: |$)`, // __uck __itch
		`(?:^| )${sep4} *(?:uck+(?:ing)?|itch)(?: |$)`, // (uck %itch
		'\\bf[@#$%^&*]{2,}(?: |$)', // f@#$
		'(?:^| )[*]{3,} (?:her+|him+|you+r?|of+|out|me+)\\b', // **** you
		'(?:^ *|[^s ] +)h +[o0] *e *s?\\b', // h o e
		`(?:^|${sep})di${sep}[ck](?:$|${sep})`, // di c / di k
		'8[:=-]{3,}[|]?[oD3>][-~]*', // penis ascii art
		'8==[|]?[oD]', // penis ascii art
		'8[ =]{2,}D', // penis ascii art
		'(?:^| )[.][i|][.](?: |$)', // penis ascii art
		'c[=-]{3,}3',
		'(?:^| )n [i!] g g [e3] s [t^](?: |$)',
		`(?<!\\bi)${wordStart}${alts('tho')}[${onlyLetterT}]+${wordEnd}`, // thot
		'child *porn', // porn
		'\\Sporn\\b',
		'nigger',
		'childrapist', // rape
		'rapeyou',
		'\\brapist',
		'(?:\\bg|being)rape?(?:ing|d)\\b',
		'rule *34',
		'[48]chan\\.', // 4chan
		'^aids$',
		'(?:p[o0]rno?hub|redtube|lemonparty|brazzers|youporn|xvidios)',
		'yiffyiff',
		// russian
		'[(]+[yу][kк][aа]', // cyka
		// polish
		fast ? 'jeban[aey]' : 'jeba(?:ć|ł[ay]?|n[aey])',
		'rozjebie', // (in any part of text)
		'spieprzaj',
		'odpierdol ?sie',
		// japanese
		'(?:^| )くそ(?: |$)',
		// moans
		// '(?:^| )o-ohh+~+(?: |$)',
		// '(?:^| )a-ahh+~*(?: |$)',
		// '(?:^| )ahh+~+(?: |$)',
	];

	const badWordsSpecific = [
		'\\bgRAPE\\b',
	];

	return { all: badWords, foreign: badWordsForeign, other: badWordsOther, specific: badWordsSpecific, fuck: fuckWords };
}

if (DEVELOPMENT && false) {
	(function () {
		const words = createBadWords(true);
		let failed = 0;

		for (const phrase of [...words.all, ...words.other, ...words.foreign, ...words.specific]) {
			if (!isAscii(phrase)) {
				console.log(`not ascii: "${phrase}" [${charsToCodes(phrase).join(', ')}]`);
				failed++;
			}
		}

		console.log('failed: ', failed);
	})();
}

export function isAscii(text: string) {
	return /^[\u0020-\u007e]+$/i.test(text);
}

const unicode = createBadWords(false);
const ascii = createBadWords(true);

function tryRegex(value: string, flags: string) {
	try {
		return new RegExp(value, flags);
	} catch (e) {
		console.error(e.message);
		return new RegExp(/(?!.*)/);
	}
}

const replaceRegex = (values: string[]) => tryRegex(`\\b(?:${values.join('|')})\\b`, 'ugi');
const replaceRegexRU = (values: string[]) => tryRegex(`${wordStartRU}(?:${values.join('|')})${wordEndRU}`, 'ugi');
const replaceRegexOther = (values: string[]) => tryRegex(`(?:${values.join('|')})`, 'ugi');
const replaceRegexSpecific = (values: string[]) => tryRegex(`(?:${values.join('|')})`, 'ug');

const testRegex = (values: string[]) => tryRegex(`\\b(?:${values.join('|')})\\b`, 'ui');
const testRegexRU = (values: string[]) => tryRegex(`${wordStartRU}(?:${values.join('|')})${wordEndRU}`, 'ui');
const testRegexOther = (values: string[]) => tryRegex(`(?:${values.join('|')})`, 'ui');
const testRegexSpecific = (values: string[]) => tryRegex(`(?:${values.join('|')})`, 'u');

const regexReplace = replaceRegex(unicode.all);
const regexReplaceRU = replaceRegexRU(unicode.foreign);
const regexReplaceOther = replaceRegexOther(unicode.other);
const regexReplaceSpecific = replaceRegexSpecific(unicode.specific);

const regexReplaceFast = replaceRegex(ascii.all);
const regexReplaceRUFast = replaceRegexRU(ascii.foreign);
const regexReplaceOtherFast = replaceRegexOther(ascii.other);
const regexReplaceSpecificFast = replaceRegexSpecific(ascii.specific);

const regexTest = testRegex(unicode.all);
const regexTestRU = testRegexRU(unicode.foreign);
const regexTestOther = testRegexOther(unicode.other);
const regexTestSpecific = testRegexSpecific(unicode.specific);

const regexTestFast = testRegex(ascii.all);
const regexTestRUFast = testRegexRU(ascii.foreign);
const regexTestOtherFast = testRegexOther(ascii.other);
const regexTestSpecificFast = testRegexSpecific(ascii.specific);

const regexTestFuck = testRegex(unicode.fuck);

const regexReplaceRUSingle = tryRegex(`${unicode.foreign.join('|')}`, 'ugi');
const regexReplacePartial = tryRegex(`${[
	...unicode.all, ...unicode.foreign, ...unicode.other, ...unicode.specific
].join('|')}`, 'ugi');

type Replacer = (match: string) => string;

const defaultReplacer: Replacer = match => repeat('*', match.length);
const createReplacerRU = (replacer = defaultReplacer): Replacer => match => match.replace(regexReplaceRUSingle, replacer);

function canUseFast(text: string) {
	return isAscii(text);
}

function slowReplace(text: string, replacer: Replacer, replacerRU: Replacer) {
	return text
		.replace(regexReplace, replacer)
		.replace(regexReplaceRU, replacerRU)
		.replace(regexReplaceOther, replacer)
		.replace(regexReplaceSpecific, replacer);
}

function fastReplace(text: string, replacer: Replacer, replacerRU: Replacer) {
	return text
		.replace(regexReplaceFast, replacer)
		.replace(regexReplaceRUFast, replacerRU)
		.replace(regexReplaceOtherFast, replacer)
		.replace(regexReplaceSpecificFast, replacer);
}

export function createFilter(replacer = defaultReplacer) {
	const replacerRU = createReplacerRU(replacer);

	return (text: string) => canUseFast(text) ?
		fastReplace(text, replacer, replacerRU) :
		slowReplace(text, replacer, replacerRU);
}

function slowTest(text: string) {
	return regexTest.test(text) ||
		regexTestRU.test(text) ||
		regexTestOther.test(text) ||
		regexTestSpecific.test(text);
}

function fastTest(text: string) {
	return regexTestFast.test(text) ||
		regexTestRUFast.test(text) ||
		regexTestOtherFast.test(text) ||
		regexTestSpecificFast.test(text);
}

export function hasBadWords(text: string) {
	return canUseFast(text) ? fastTest(text) : slowTest(text);
}

export function hasFuck(text: string) {
	return regexTestFuck.test(text);
}

export const filterBadWords = createFilter();

export function filterName(name: string) {
	const filtered = filterBadWords(name);
	return name === filtered ? name : repeat('*', name.length);
}

export function filterBadWordsPartial(text: string, replacer = defaultReplacer): string {
	return text.replace(regexReplacePartial, replacer);
}

export function findMatch(text: string): string | undefined {
	return unicode.all.find(x => (tryRegex(`\\b(?:${x})\\b`, 'ui')).test(text))
		|| unicode.foreign.find(x => (tryRegex(`${wordStartRU}(?:${x})${wordEndRU}`, 'ui')).test(text))
		|| unicode.other.find(x => (tryRegex(`${x}`, 'u')).test(text))
		|| unicode.specific.find(x => (tryRegex(`${x}`, 'u')).test(text));
}

export function createMatchEntries() {
	return [
		...unicode.all.map(line => ({ line, regex: tryRegex(`\\b(?:${line})\\b`, 'ui') })),
		...unicode.foreign.map(line => ({ line, regex: tryRegex(`${wordStartRU}(?:${line})${wordEndRU}`, 'ui') })),
		...unicode.other.map(line => ({ line, regex: tryRegex(line, 'ui') })),
		...unicode.specific.map(line => ({ line, regex: tryRegex(line, 'u') })),
	];
}
