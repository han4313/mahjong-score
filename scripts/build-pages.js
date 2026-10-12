// 產生可被 Google 收錄的靜態內容頁（規則、台數表、計分教學…），放進 dist/。
// 在 `vite build` 之後執行。台數表和計分範例直接取自 App 的預設值與計分程式，內容不會和 App 不一致。
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { DEFAULT_SETTINGS, DEFAULT_TAI_ITEMS } from '../src/defaults.js'
import { calcWin } from '../src/scoring.js'
import { extraPages } from './extra-pages.js'

const here = path.dirname(fileURLToPath(import.meta.url))
const DIST = path.join(here, '..', 'dist')
const SITE_URL = (process.env.SITE_URL || 'https://mahjong-score-dfom.onrender.com').replace(/\/$/, '')
const UPDATED = new Date().toISOString().slice(0, 10)
const SITE_NAME = '麻將計分'

// ---------- 台數表說明（鍵 = defaults.js 的 id）----------
const TAI_NOTE = {
  menqing: '沒有吃、碰、明槓，牌都是自己摸進來的（暗槓可以），放槍胡時算 1 台。',
  menqing3: '門清、自摸、不求人合計 3 台。自摸時用這個，不再另外加門清和自摸。',
  single: '只聽一張牌（單吊、嵌張或邊張）。',
  flower: '常見算法是每張花牌 1 台；也有只算與自己座位相符的花，請依牌友習慣。',
  robkong: '別人加槓時，胡他要加槓的那張牌。',
  kongwin: '槓牌後補牌，補進來的牌剛好自摸胡。',
  sea: '牌牆最後一張牌自摸胡。',
  river: '別人打出最後一張牌，你胡了。',
  roundwind: '手上有「這一圈的風」的刻子（例如東風圈的東風刻）。',
  seatwind: '手上有「自己座位的風」的刻子。',
  dragon: '中、發、白任一種的刻子，每組 1 台。',
  pinghu: '全部是順子、眼睛不是字牌、胡雙面聽。有些地區要求沒有花牌。',
  quanqiu: '全部都是吃、碰、槓（明），手上只剩一張牌單吊，並且胡別人打的牌。',
  three_conceal: '手上有三組自己摸成的暗刻。',
  pengpeng: '全部是刻子（或槓），加一對眼睛，沒有順子。',
  hunyise: '只有一種花色的數字牌，加上字牌。',
  four_conceal: '四組暗刻。',
  qingyise: '全部是同一種花色的數字牌，沒有字牌。',
  five_conceal: '五組暗刻。',
  small_dragon: '中發白其中兩種是刻子，另一種是眼睛。',
  big_dragon: '中、發、白三種都是刻子。',
  small_wind: '東南西北其中三種是刻子，另一種是眼睛。',
  big_wind: '東南西北四種都是刻子。',
  honors: '全部都是字牌（風牌與三元牌）。',
  eight_flowers: '一個人集滿 8 張花牌。',
  seven_rob_one: '一個人集滿 7 張花牌，被另一人補到第 8 張花時，7 張的人胡牌。',
  heaven: '莊家起手摸完牌就直接胡牌。',
  earth: '閒家在第一輪、還沒有人吃碰槓之前就胡牌。',
  human: '閒家在第一輪、胡莊家打出的第一張牌（各地定義略有不同）。',
}

const escape = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// ---------- 頁面共用外框 ----------
const NAV = [
  ['/rules/', '基本規則'],
  ['/tai/', '台數表'],
  ['/scoring/', '台數怎麼算'],
  ['/patterns/', '牌型圖解'],
  ['/glossary/', '術語大全'],
  ['/settlement/', '結算分帳'],
  ['/beginner/', '新手教學'],
]

function page({ slug, title, description, body }) {
  const url = `${SITE_URL}/${slug}/`
  const nav = NAV.map(([href, label]) => `<a href="${href}"${href === `/${slug}/` ? ' class="on"' : ''}>${label}</a>`).join('')
  return `<!doctype html>
<html lang="zh-Hant">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escape(title)}｜${SITE_NAME}</title>
<meta name="description" content="${escape(description)}" />
<link rel="canonical" href="${url}" />
<meta property="og:type" content="article" />
<meta property="og:title" content="${escape(title)}" />
<meta property="og:description" content="${escape(description)}" />
<meta property="og:url" content="${url}" />
<meta property="og:locale" content="zh_TW" />
<script type="application/ld+json">${JSON.stringify({
  "@context": "https://schema.org",
  "@graph": [
    { "@type": "Article", headline: title, description, inLanguage: "zh-TW", dateModified: UPDATED, mainEntityOfPage: url, author: { "@type": "Organization", name: SITE_NAME } },
    { "@type": "BreadcrumbList", itemListElement: [
      { "@type": "ListItem", position: 1, name: SITE_NAME, item: SITE_URL + "/" },
      { "@type": "ListItem", position: 2, name: title, item: url },
    ] },
  ],
})}</script>
<link rel="stylesheet" href="/page.css" />
</head>
<body>
<header class="top">
  <a class="brand" href="/"><span class="tile">麻</span>${SITE_NAME}</a>
  <a class="cta" href="/">開始計分</a>
</header>
<nav class="nav">${nav}</nav>
<main>
<article>
<h1>${escape(title)}</h1>
<p class="meta">最後更新：${UPDATED}</p>
${body}
</article>
<aside class="promo">
  <b>打牌時不用再自己算</b>
  <p>${SITE_NAME}可以登記每一把、自動算莊家與連莊、整晚結算誰付誰多少，還能開房和朋友一起玩小遊戲。免安裝、免註冊。</p>
  <a class="cta" href="/">打開${SITE_NAME}</a>
</aside>
</main>
<footer>
  <p>${SITE_NAME}・<a href="/privacy/">隱私權政策</a></p>
  <p class="small">本站內容為一般性介紹。台灣麻將各地、各桌的規則與台數常有不同，請以牌友之間的約定為準。</p>
</footer>
</body>
</html>
`
}

// ---------- 計分範例（用 App 的計分程式算，不手打數字）----------
const S = DEFAULT_SETTINGS
const ex = (args) => calcWin({ settings: S, ...args }).deltas
const NAMES = ['東（莊）', '南', '西', '北']
function deltaTable(deltas) {
  const rows = deltas.map((d, i) => `<tr><td>${NAMES[i]}</td><td class="${d > 0 ? 'win' : d < 0 ? 'lose' : ''}">${d > 0 ? '+' : ''}${d}</td></tr>`).join('')
  return `<table class="small-table"><tr><th>玩家</th><th>輸贏</th></tr>${rows}</table>`
}

const taiGroups = [...new Set(DEFAULT_TAI_ITEMS.map((i) => i.group))]
const taiTables = taiGroups
  .map((g) => {
    const rows = DEFAULT_TAI_ITEMS.filter((i) => i.group === g)
      .map((i) => `<tr><td>${escape(i.name)}</td><td class="num">${i.tai} 台</td><td>${escape(TAI_NOTE[i.id] || '')}</td></tr>`)
      .join('')
    return `<h2>${g}</h2><table><tr><th>台型</th><th>台數</th><th>說明</th></tr>${rows}</table>`
  })
  .join('\n')

// ---------- 各頁內容 ----------
const PAGES = [
  {
    slug: 'rules',
    title: '台灣麻將規則：16 張玩法完整說明',
    description: '台灣麻將（16 張）怎麼玩？牌的組成、起手牌、吃碰槓、胡牌條件、莊家與連莊、流局，一次說清楚。',
    body: `
<p>台灣麻將又稱 16 張麻將，是台灣最普遍的玩法。這篇整理基本規則，看完就能上桌。各地細節略有不同，文中會標出常見的差異。</p>

<h2>一、用哪些牌</h2>
<p>一副牌共 144 張：</p>
<ul>
<li><b>萬子、筒子、條子</b>：各 9 種數字、每種 4 張，共 108 張。</li>
<li><b>風牌</b>：東、南、西、北，各 4 張，共 16 張。</li>
<li><b>三元牌</b>：中、發、白，各 4 張，共 12 張。風牌和三元牌合稱字牌。</li>
<li><b>花牌</b>：春夏秋冬、梅蘭竹菊，各 1 張，共 8 張。</li>
</ul>

<h2>二、目標：胡牌</h2>
<p>每人手上維持 16 張，摸進第 17 張後湊成 <b>5 組面子加 1 對眼睛</b> 就是胡牌。</p>
<ul>
<li><b>順子</b>：同花色連續三張，例如 三四五萬。字牌不能組順子。</li>
<li><b>刻子</b>：三張一樣的牌，例如 三張東風。</li>
<li><b>眼睛</b>：兩張一樣的牌。</li>
</ul>

<h2>三、一局怎麼進行</h2>
<ol>
<li><b>定位置</b>：擲骰決定誰當第一個莊家（東家），其他人依序是南、西、北。</li>
<li><b>砌牌、起手</b>：每人拿 16 張，莊家再多摸 1 張。</li>
<li><b>補花</b>：拿到花牌時亮出來，從牌牆尾端補一張。</li>
<li><b>輪流出牌</b>：莊家先打一張，之後順時針輪流「摸一張、打一張」。</li>
<li><b>胡牌或流局</b>：有人胡牌，或牌牆摸到剩最後約 16 張還沒人胡，就流局。</li>
</ol>

<h2>四、吃、碰、槓</h2>
<ul>
<li><b>吃</b>：只能吃<b>上家</b>（出牌順序在你前面的那位）剛打出的牌，湊成順子。</li>
<li><b>碰</b>：手上有兩張一樣的牌，任何人打出第三張時都可以碰，湊成刻子。</li>
<li><b>槓</b>：四張一樣的牌。別人打出第四張叫明槓；自己摸齊四張叫暗槓；碰過的刻子再摸到第四張叫加槓。槓完要從牌牆尾端補一張。</li>
<li>吃碰槓都要把那組牌亮在桌上，這些牌就叫「明牌」，沒有吃碰槓（暗槓除外）的狀態叫<b>門清</b>。</li>
<li>多人同時想要同一張牌時，優先順序通常是<b>胡 &gt; 碰槓 &gt; 吃</b>。</li>
</ul>

<h2>五、怎樣算胡牌</h2>
<ul>
<li><b>自摸</b>：自己摸進來的牌湊成胡牌，另外三家都要付錢。</li>
<li><b>放槍（點炮）</b>：胡別人打出的牌，只有打那張牌的人付錢。</li>
<li>有人打出你要胡的牌，但你想等自摸，可以不胡。不過一般會有「過水」規則：這一輪放過就不能再胡同一張，細節各桌不同。</li>
</ul>

<h2>六、莊家、連莊與圈風</h2>
<ul>
<li>莊家胡牌，<b>連莊</b>：下一把繼續當莊，連莊數加 1。</li>
<li>閒家胡牌，<b>輪莊</b>：換下家當莊，連莊數歸零。</li>
<li>流局時，常見做法是莊家連莊，連莊數是否加 1 各桌不同。${SITE_NAME}可以設定。</li>
<li>連莊的莊家要多算台數，叫<b>連莊拉莊</b>，公式是「連 N 拉 N」，莊家本身 1 台再加 2N 台，詳見 <a href="/scoring/">台數怎麼算</a>。</li>
<li><b>圈風與門風</b>：四個人輪完一輪為一圈，依序是東圈、南圈、西圈、北圈。手上有「圈風」或「自己座位風」的刻子各算 1 台。</li>
</ul>

<h2>七、各地常見差異</h2>
<p>台灣麻將在這些地方常有不同，開打前最好先講清楚：</p>
<ul>
<li>底與每台的金額（例如「30 / 10」）。</li>
<li>流局是否連莊、連莊數是否增加。</li>
<li>花牌每張算不算 1 台，或只算正花。</li>
<li>能不能一炮多響、有沒有過水規則。</li>
<li>某些大牌（例如人胡、地胡）算幾台。</li>
</ul>
<p>接著可以看 <a href="/tai/">台數表</a>，或直接用 <a href="/">${SITE_NAME}</a> 邊打邊記。</p>
`,
  },
  {
    slug: 'tai',
    title: '台灣麻將台數表：常見台型一覽',
    description: '台灣麻將常見台型與台數：門清、自摸、平胡、碰碰胡、清一色、大三元、天胡等，附簡單說明。',
    body: `
<p>下面是坊間常見的台數表，也是${SITE_NAME}的預設值。台灣麻將沒有全國統一的標準，各地、各桌的台數可能不同，請以你們的約定為準；在 App 的「設定」頁可以自行修改每個台型。</p>
<p>另外兩種台數是系統自動加的，不在表內：<b>自摸</b>（預設加 ${S.tsumoTai} 台），以及<b>莊家台</b>（連 N 拉 N，共 2N+1 台）。計算方式見 <a href="/scoring/">台數怎麼算</a>。</p>
${taiTables}
<p class="note">這份表是一般性整理，沒有涵蓋所有地方玩法，也不是官方標準。台數有爭議時，以現場牌友的共識為準。</p>
`,
  },
  {
    slug: 'scoring',
    title: '台灣麻將台數怎麼算：底、台、莊家台、自摸',
    description: '台灣麻將的金額怎麼算？底與每台、莊家台（連 N 拉 N）、自摸與放槍的差別，附實際算例。',
    body: `
<p>台灣麻將算錢的基本概念很簡單：先約定好<b>底</b>和<b>每台</b>的金額，輸家付的錢就是 <b>底 ＋ 台數 × 每台</b>。常見約定是「30 / 10」，也就是底 30、每台 10。</p>

<h2>一、台數怎麼加</h2>
<p>一把牌的總台數由這幾部分加起來：</p>
<ul>
<li><b>牌型台</b>：門清、平胡、碰碰胡、清一色等，見 <a href="/tai/">台數表</a>。</li>
<li><b>自摸</b>：自摸胡的時候再加 1 台（本站預設，各桌可能不同）。</li>
<li><b>莊家台</b>：只要莊家參與（莊家胡牌，或莊家是付錢的那一方）才加。</li>
</ul>

<h2>二、莊家台：連 N 拉 N</h2>
<p>莊家本身算 <b>1 台</b>。每連莊一次再加 <b>2 台</b>，所以連莊 N 次的莊家台是 <b>2N + 1</b> 台。口訣是「連 N 拉 N」。</p>
<table class="small-table">
<tr><th>連莊數</th><th>莊家台</th></tr>
<tr><td>第一次當莊（連 0）</td><td class="num">1 台</td></tr>
<tr><td>連 1</td><td class="num">3 台</td></tr>
<tr><td>連 2</td><td class="num">5 台</td></tr>
<tr><td>連 3</td><td class="num">7 台</td></tr>
</table>

<h2>三、放槍與自摸誰付錢</h2>
<ul>
<li><b>放槍（點炮）</b>：只有放槍的人付錢，付 底 ＋ （台數 ＋ 莊家台）× 每台。</li>
<li><b>自摸</b>：其他三家<b>都</b>要付錢，各付一份。</li>
<li><b>莊家台怎麼加</b>：只有「莊家胡牌」或「付錢的人是莊家」時，那一份才加莊家台。閒家贏閒家的那份不加。</li>
</ul>

<h2>四、算例（底 ${S.base}、每台 ${S.perTai}、自摸加 ${S.tsumoTai} 台）</h2>
<p>以下數字是用${SITE_NAME}的計分程式算出來的。</p>

<h3>例 1：閒家放槍給閒家，3 台</h3>
<p>南家胡了西家打出的牌，牌型共 3 台，東是莊家（連 0）。只有西家付錢，莊家沒參與，不加莊家台：${S.base} ＋ 3 × ${S.perTai} ＝ ${S.base + 3 * S.perTai}。</p>
${deltaTable(ex({ dealer: 0, lian: 0, winner: 1, type: 'ron', loser: 2, tai: 3 }))}

<h3>例 2：閒家自摸，牌型 3 台</h3>
<p>南家自摸，牌型 3 台，加自摸 ${S.tsumoTai} 台共 ${3 + S.tsumoTai} 台。另外三家都要付，其中<b>莊家要多付莊家台 1 台</b>。</p>
${deltaTable(ex({ dealer: 0, lian: 0, winner: 1, type: 'tsumo', tai: 3 }))}

<h3>例 3：莊家連 2 次後，胡別人放槍，牌型 2 台</h3>
<p>連莊 2 次，莊家台 ＝ 2 × 2 ＋ 1 ＝ 5 台。莊家胡牌，放槍的人付：${S.base} ＋ （2 ＋ 5）× ${S.perTai} ＝ ${S.base + 7 * S.perTai}。</p>
${deltaTable(ex({ dealer: 0, lian: 2, winner: 0, type: 'ron', loser: 2, tai: 2 }))}

<h2>五、門清一摸三</h2>
<p>「門清一摸三」是門清、自摸、不求人合計 3 台。自摸時用它就好，不要再另外加門清與自摸，否則會重複算。${SITE_NAME}在選到自摸時，會自動隱藏單獨的「門清」，並且不再重複加自摸台。</p>

<h2>六、一整晚結算</h2>
<p>打完之後，把每個人的總輸贏相加，就知道誰贏誰輸。要少轉幾次帳，可以讓輸最多的人直接付給贏最多的人，用最少筆數轉完。${SITE_NAME}的「結算」功能會自動排好，並產生可以貼到 LINE 群組的文字。</p>
<p><a href="/">用${SITE_NAME}計分</a>，不用再拿紙筆和計算機。</p>
`,
  },
  {
    slug: 'beginner',
    title: '麻將新手教學：名詞、流程、第一次上桌',
    description: '第一次打台灣麻將？常見名詞解釋、一局的流程、上桌前要講好的事，還有怎麼用手機計分。',
    body: `
<h2>先搞懂這些名詞</h2>
<table>
<tr><th>名詞</th><th>意思</th></tr>
<tr><td>莊家</td><td>這一把的第一個出牌的人，輸贏的台數比較多。</td></tr>
<tr><td>閒家</td><td>除了莊家以外的人。</td></tr>
<tr><td>面子</td><td>順子或刻子，三張一組。</td></tr>
<tr><td>眼睛（將）</td><td>一對相同的牌。</td></tr>
<tr><td>聽牌</td><td>再摸（或胡）一張就能胡牌的狀態。</td></tr>
<tr><td>吃 / 碰 / 槓</td><td>拿別人打出的牌，湊成順子、刻子或槓子。</td></tr>
<tr><td>門清</td><td>沒有吃碰明槓，牌都是自己摸的。</td></tr>
<tr><td>自摸</td><td>自己摸進來的牌胡牌。</td></tr>
<tr><td>放槍 / 點炮</td><td>打出的牌被別人胡了，由你付錢。</td></tr>
<tr><td>花牌</td><td>春夏秋冬、梅蘭竹菊，摸到要亮出來補牌，通常每張算 1 台。</td></tr>
<tr><td>流局</td><td>牌摸完了還沒人胡，這把不分輸贏。</td></tr>
<tr><td>連莊</td><td>莊家贏（或流局）後繼續當莊。</td></tr>
</table>

<h2>第一次上桌，先講好這幾件事</h2>
<ol>
<li><b>底與每台</b>：例如「30 / 10」或「50 / 20」。</li>
<li><b>自摸加幾台</b>：多數是 1 台。</li>
<li><b>流局連不連莊</b>、連莊數要不要加。</li>
<li><b>花牌怎麼算</b>。</li>
<li><b>有哪些特殊牌型要算台</b>，不確定就先參考 <a href="/tai/">台數表</a>。</li>
</ol>

<h2>新手的三個建議</h2>
<ul>
<li>先學會看自己的牌：往 5 組面子加 1 對眼睛的方向湊，不用急著追大牌。</li>
<li>先從門清、平胡、碰碰胡這些基本牌型開始認，再慢慢認大牌。</li>
<li>放槍的牌要小心：觀察別人丟了什麼、手上留了什麼，比自己湊牌更重要。</li>
</ul>

<h2>用手機計分</h2>
<ol>
<li>打開 <a href="/">${SITE_NAME}</a>，新增牌局，輸入四位玩家的名字。</li>
<li>每把結束點「登記胡牌」，選誰胡、自摸還是放槍、有哪些台，系統會自動算出每個人輸贏，也會自動換莊與連莊。</li>
<li>想讓朋友一起看，到「設定」產生房號，朋友輸入房號就能看到同一份戰績。</li>
<li>打完按「結算」，會算出誰要付給誰多少，還能複製成文字貼到群組。</li>
</ol>
<p>更多規則見 <a href="/rules/">基本規則</a>，台數的算法見 <a href="/scoring/">台數怎麼算</a>。</p>
`,
  },
  {
    slug: 'privacy',
    title: '隱私權政策',
    description: `${SITE_NAME}如何處理你的資料：牌局資料存在你的裝置、房號資料存在伺服器，以及使用的第三方服務。`,
    body: `
<p>本政策說明 ${SITE_NAME}（以下簡稱「本站」）如何處理使用者的資料。</p>

<h2>我們不要求註冊</h2>
<p>使用本站不需要建立帳號，也不需要提供姓名、電話或信箱。</p>

<h2>存在你裝置上的資料</h2>
<p>牌局、玩家名字、台數設定等資料，預設只儲存在你自己瀏覽器的本機儲存空間（localStorage）。清除瀏覽器資料或換裝置後，這些資料就不會在了。</p>

<h2>房號與朋友一起玩</h2>
<p>當你產生房號時，該牌局的內容（牌局名稱、玩家暱稱、每把紀錄、遊戲進度）會上傳到本站的伺服器，讓拿到房號的朋友看得到並共同編輯。請注意：</p>
<ul>
<li>知道房號的人都可以讀取與修改該房間的內容，請只把房號分享給你信任的人。</li>
<li>請不要在暱稱或名稱中填寫真實姓名以外的個人敏感資料。</li>
<li>房間資料在長時間沒有使用後會被自動刪除。</li>
</ul>

<h2>匿名使用人數</h2>
<p>為了顯示「目前有多少人在線」，你的瀏覽器會產生一組隨機的匿名編號（存在本機，和你的身分無關），並定期通知伺服器。伺服器只計算人數，這組編號不會存檔，伺服器重啟後就會清空。</p>

<h2>伺服器紀錄</h2>
<p>為了維持服務與防止濫用，伺服器會暫時使用連線的 IP 位址進行請求次數限制，不會將其與你的身分連結，也不會長期保存。</p>

<h2>第三方服務</h2>
<ul>
<li><b>Ko-fi</b>：頁面上的贊助按鈕會連到 Ko-fi 的網站，付款過程由 Ko-fi 與其付款服務處理，本站不會取得你的付款資料。</li>
<li>本站未來可能加入流量分析或廣告服務（例如 Google 提供的服務），這類服務可能使用 Cookie。若有加入，會在此頁更新說明。</li>
</ul>

<h2>政策更新與聯絡</h2>
<p>本政策可能不定期更新，最新版本以本頁為準。</p>
`,
  },
]

PAGES.splice(4, 0, ...extraPages({ SITE_NAME })) // 補充頁，順序不影響網址

// ---------- 輸出 ----------
const CSS = `
:root{--ink:#26302a;--muted:#667;--paper:#faf6ea;--felt:#1e5c3a;--gold:#d9a93b;--line:#e4dcc4}
*{box-sizing:border-box}
body{margin:0;background:var(--paper);color:var(--ink);font:16px/1.8 -apple-system,"Noto Sans TC","PingFang TC","Microsoft JhengHei",sans-serif}
a{color:#1a6b43}
.top{background:var(--felt);display:flex;align-items:center;justify-content:space-between;padding:10px 16px}
.brand{color:#fff;text-decoration:none;font-weight:700;font-size:18px;display:flex;align-items:center;gap:8px}
.tile{display:inline-grid;place-items:center;width:28px;height:34px;background:#fff;color:#c0392b;border-radius:5px;font-weight:700}
.cta{background:var(--gold);color:#2b2205;text-decoration:none;padding:8px 14px;border-radius:8px;font-weight:700;display:inline-block}
.nav{display:flex;gap:4px;overflow-x:auto;padding:8px 12px;background:#17492e}
.nav a{color:#cfe6d8;text-decoration:none;padding:6px 12px;border-radius:16px;white-space:nowrap;font-size:15px}
.nav a.on{background:#fff;color:var(--felt);font-weight:700}
main{max-width:760px;margin:0 auto;padding:20px 16px 40px}
h1{font-size:26px;line-height:1.4;margin:8px 0}
h2{font-size:20px;margin:30px 0 8px;padding-left:10px;border-left:4px solid var(--gold)}
h3{font-size:17px;margin:20px 0 4px}
.meta{color:var(--muted);font-size:13px;margin:0 0 16px}
ul,ol{padding-left:22px}li{margin:4px 0}
table{width:100%;border-collapse:collapse;background:#fff;margin:10px 0;font-size:15px}
th,td{border:1px solid var(--line);padding:8px 10px;text-align:left;vertical-align:top}
th{background:#f1ead3}
.num,td.win,td.lose{white-space:nowrap;font-variant-numeric:tabular-nums}
td.win{color:#1a7a43;font-weight:700}td.lose{color:#b0392b;font-weight:700}
.small-table{width:auto;min-width:240px}
.hand{display:inline-flex;flex-wrap:wrap;gap:8px;vertical-align:middle}
.grp{display:inline-flex;gap:2px}
.c{display:inline-flex;flex-direction:column;align-items:center;justify-content:center;width:30px;height:40px;background:#fff;border:1px solid #b9b08e;border-bottom-width:3px;border-radius:5px;font-weight:700;font-size:16px;line-height:1.05;color:#26302a}
.c small{font-size:10px;font-weight:600}
.c.red{color:#c0392b}.c.green{color:#1e7a46}
pre{background:#fff;border:1px solid var(--line);border-radius:8px;padding:12px;overflow-x:auto;line-height:1.6}
.note{color:var(--muted);font-size:14px}
.promo{margin-top:36px;padding:16px;background:#fff;border:2px solid var(--gold);border-radius:12px}
.promo p{margin:4px 0 10px}
footer{text-align:center;color:var(--muted);padding:20px 16px 40px;font-size:14px}
footer .small{font-size:12px}
@media(max-width:520px){h1{font-size:22px}th,td{padding:6px 7px;font-size:14px}}
`

fs.mkdirSync(DIST, { recursive: true })
fs.writeFileSync(path.join(DIST, 'page.css'), CSS.trim())
for (const p of PAGES) {
  const dir = path.join(DIST, p.slug)
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(path.join(dir, 'index.html'), page(p))
}

const indexFile = path.join(DIST, 'index.html')
fs.writeFileSync(indexFile, fs.readFileSync(indexFile, 'utf8').replaceAll('__SITE_URL__', SITE_URL))

const urls = ['', ...PAGES.map((p) => `${p.slug}/`)]
fs.writeFileSync(
  path.join(DIST, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
    .map((u) => `<url><loc>${SITE_URL}/${u}</loc><lastmod>${UPDATED}</lastmod></url>`)
    .join('\n')}\n</urlset>\n`
)
fs.writeFileSync(path.join(DIST, 'robots.txt'), `User-agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: ${SITE_URL}/sitemap.xml\n`)

console.log(`內容頁已產生：${PAGES.map((p) => p.slug).join(', ')}（網址 ${SITE_URL}）`)
