// 搜尋用的補充內容頁：牌型圖解、術語大全、結算分帳。由 build-pages.js 載入。
import { settle, settlementText } from '../src/settle.js'

// ---------- 用文字小方塊畫牌 ----------
// '123m 456p 東東東' → 每個空白分一組；數字 + m/p/s（萬/筒/條），或直接寫字牌
const NUM = '一二三四五六七八九'
const SUIT = { m: '萬', p: '筒', s: '條' }
const chip = (face, sub = '', cls = '') => `<span class="c ${cls}">${face}${sub ? `<small>${sub}</small>` : ''}</span>`
function honor(ch) {
  const cls = ch === '中' ? 'red' : ch === '發' ? 'green' : ''
  return chip(ch, '', cls)
}
export function tiles(spec) {
  return `<span class="hand">${spec
    .split(' ')
    .map((g) => {
      const m = g.match(/^(\d+)([mps])$/)
      const inner = m ? [...m[1]].map((d) => chip(NUM[d - 1], SUIT[m[2]], m[2] === 'm' ? 'red' : m[2] === 's' ? 'green' : '')).join('') : [...g].map(honor).join('')
      return `<span class="grp">${inner}</span>`
    })
    .join('')}</span>`
}

export function extraPages({ SITE_NAME }) {
  // 結算範例：用 App 的演算法算
  const players = [
    { id: 'a', name: '阿明', total: 300 },
    { id: 'b', name: '小華', total: 100 },
    { id: 'c', name: '大雄', total: -150 },
    { id: 'd', name: '小美', total: -250 },
  ]
  const transfers = settle(players)
  const settleTable = `<table class="small-table"><tr><th>玩家</th><th>總輸贏</th></tr>${players
    .map((p) => `<tr><td>${p.name}</td><td class="${p.total > 0 ? 'win' : 'lose'}">${p.total > 0 ? '+' : ''}${p.total}</td></tr>`)
    .join('')}</table>`
  const transferList = `<ul>${transfers.map((t) => `<li>${t.from} 付給 ${t.to}　<b>${t.amount}</b></li>`).join('')}</ul>`
  const sample = settlementText('週五麻將夜', players, transfers)

  return [
    {
      slug: 'patterns',
      title: '台灣麻將常見胡牌牌型圖解',
      description: '用圖解看懂台灣麻將常見牌型：平胡、碰碰胡、混一色、清一色、小三元、大三元、字一色，還有雙面、嵌張、邊張、單吊的聽牌差別。',
      body: `
<p>牌型文字說明很抽象，這裡用牌面排出來讓你看。每個範例都是胡牌時手上的 17 張（5 組面子＋1 對眼睛）。台數請看 <a href="/tai/">台數表</a>，各桌略有不同。</p>

<h2>先認識基本組合</h2>
<ul>
<li><b>順子</b>（同花色連續三張）：${tiles('234m')}</li>
<li><b>刻子</b>（三張一樣）：${tiles('777p')}　字牌也能組刻子：${tiles('東東東')}</li>
<li><b>眼睛</b>（一對）：${tiles('55s')}</li>
</ul>
<p>一副完整的胡牌手牌，例如：</p>
<p>${tiles('123m 456m 789p 234s 東東東 白白')}</p>
<p>這手是 4 組順子、1 組東風刻子，再加 1 對白板當眼睛，剛好 5 組面子加眼睛。下面每個範例也都湊滿 5 組面子加眼睛。</p>

<h2>平胡</h2>
<p>5 組全是順子，眼睛不是字牌，並且是雙面聽。</p>
<p>${tiles('123m 456m 789p 234s 567s 55p')}</p>

<h2>碰碰胡</h2>
<p>5 組全是刻子，沒有順子。</p>
<p>${tiles('111m 999p 333s 東東東 中中中 55m')}</p>

<h2>混一色</h2>
<p>只有一種花色的數字牌，加上字牌。</p>
<p>${tiles('123m 456m 789m 東東東 中中中 55m')}</p>

<h2>清一色</h2>
<p>全部是同一種花色的數字牌，不能有字牌。</p>
<p>${tiles('123m 456m 789m 234m 567m 11m')}</p>

<h2>小三元</h2>
<p>中、發、白其中兩種是刻子，另一種是眼睛。</p>
<p>${tiles('中中中 發發發 白白 123m 456p 789s')}</p>

<h2>大三元</h2>
<p>中、發、白三種都是刻子。</p>
<p>${tiles('中中中 發發發 白白白 123m 456p 77s')}</p>

<h2>字一色</h2>
<p>全部是字牌（風牌與三元牌）。</p>
<p>${tiles('東東東 南南南 西西西 中中中 發發發 白白')}</p>

<h2>聽牌的四種形狀</h2>
<p>聽牌是「再拿到一張就胡」。同一張牌，聽的方式不同，算的台也可能不同。</p>
<table>
<tr><th>形狀</th><th>手上的牌</th><th>聽哪些牌</th></tr>
<tr><td><b>雙面</b></td><td>${tiles('45m')}</td><td>三萬或六萬（兩面都能胡，最容易胡）</td></tr>
<tr><td><b>嵌張</b></td><td>${tiles('46m')}</td><td>只胡五萬（卡在中間）</td></tr>
<tr><td><b>邊張</b></td><td>${tiles('12m')} 或 ${tiles('89m')}</td><td>只胡三萬／只胡七萬</td></tr>
<tr><td><b>單吊</b></td><td>${tiles('5m')}（單張等配對）</td><td>只胡五萬，湊成眼睛</td></tr>
</table>
<p>只聽一張牌的情況（嵌張、邊張、單吊）常見的算法是「獨聽」，可加 1 台，但細節各地不同。</p>

<p>想快速確認這把牌算幾台、要付多少錢，用 <a href="/">${SITE_NAME}</a> 登記，選好台型就會自動算。</p>
`,
    },
    {
      slug: 'glossary',
      title: '麻將術語大全：新手必懂的名詞解釋',
      description: '台灣麻將常見術語一次看：莊家、閒家、聽牌、吃碰槓、自摸、放槍、門清、連莊、嵌張、單吊、過水、詐胡、海底撈月等。',
      body: `
<p>這份整理依「牌、動作、牌型、計分、其他」分類，查起來比較快。各地說法略有差異，這裡寫的是常見用法。</p>

<h2>牌與牌桌</h2>
<table>
<tr><th>名詞</th><th>意思</th></tr>
<tr><td>萬、筒、條</td><td>三種數字花色，各 1 到 9。也叫數牌。</td></tr>
<tr><td>字牌</td><td>風牌（東南西北）與三元牌（中發白），不能組順子。</td></tr>
<tr><td>花牌</td><td>春夏秋冬、梅蘭竹菊共 8 張，摸到要亮出來，從牌牆尾端補牌。</td></tr>
<tr><td>牌牆</td><td>洗好牌後堆起來的牌，大家輪流從這裡摸牌。</td></tr>
<tr><td>河</td><td>桌子中間大家打出的牌。</td></tr>
<tr><td>圈風</td><td>目前打到哪一圈（東圈、南圈、西圈、北圈）。</td></tr>
<tr><td>門風</td><td>你這把坐的位置對應的風。</td></tr>
</table>

<h2>角色</h2>
<table>
<tr><th>名詞</th><th>意思</th></tr>
<tr><td>莊家</td><td>這把第一個出牌的人，輸贏的台數會多算。</td></tr>
<tr><td>閒家</td><td>除了莊家以外的三個人。</td></tr>
<tr><td>上家 / 下家</td><td>出牌順序在你前面／後面的人。你只能吃上家打的牌。</td></tr>
</table>

<h2>動作</h2>
<table>
<tr><th>名詞</th><th>意思</th></tr>
<tr><td>摸牌 / 打牌</td><td>從牌牆拿一張，再打出一張。</td></tr>
<tr><td>吃</td><td>吃上家打出的牌，湊成順子。</td></tr>
<tr><td>碰</td><td>任何人打出你手上已有兩張的牌，湊成刻子。</td></tr>
<tr><td>槓</td><td>四張一樣的牌。別人打的是明槓，自己摸齊是暗槓，碰過再摸到是加槓。</td></tr>
<tr><td>補花</td><td>摸到花牌，亮出來後補摸一張。</td></tr>
<tr><td>過水</td><td>這一輪放過了可以胡的牌，之後在輪到自己摸牌前不能再胡。是否有這個規則，各桌不同。</td></tr>
<tr><td>詐胡</td><td>宣布胡牌，但其實沒有胡。通常要賠錢，罰法各桌不同。</td></tr>
</table>

<h2>胡牌與聽牌</h2>
<table>
<tr><th>名詞</th><th>意思</th></tr>
<tr><td>面子</td><td>順子或刻子，三張一組。</td></tr>
<tr><td>眼睛（將）</td><td>一對相同的牌。</td></tr>
<tr><td>聽牌</td><td>再拿到一張特定的牌就能胡。</td></tr>
<tr><td>雙面 / 嵌張 / 邊張 / 單吊</td><td>聽牌的四種形狀，見 <a href="/patterns/">牌型圖解</a>。</td></tr>
<tr><td>胡牌</td><td>手上湊成 5 組面子加 1 對眼睛。</td></tr>
<tr><td>自摸</td><td>自己摸進來的牌胡牌，另外三家都付錢。</td></tr>
<tr><td>放槍 / 點炮</td><td>你打出的牌被別人胡了，由你付錢。</td></tr>
<tr><td>一炮多響</td><td>同一張牌同時被不只一個人胡。能不能這樣算，各桌不同。</td></tr>
<tr><td>搶槓</td><td>別人要加槓時，你剛好胡那張牌。</td></tr>
<tr><td>槓上開花</td><td>槓牌後補牌，補進來的牌剛好自摸胡。</td></tr>
<tr><td>海底撈月</td><td>牌牆最後一張牌自摸胡。</td></tr>
<tr><td>河底撈魚</td><td>別人打出最後一張牌，你胡了。</td></tr>
<tr><td>流局</td><td>牌摸完了還沒有人胡，這把不分輸贏。</td></tr>
</table>

<h2>牌型與台數</h2>
<table>
<tr><th>名詞</th><th>意思</th></tr>
<tr><td>台</td><td>計算輸贏的單位，台數越多付越多。</td></tr>
<tr><td>門清</td><td>沒有吃、碰、明槓，牌都是自己摸的（暗槓可以）。</td></tr>
<tr><td>不求人</td><td>門清而且自摸胡牌。</td></tr>
<tr><td>門清一摸三</td><td>門清、自摸、不求人合計 3 台。</td></tr>
<tr><td>暗刻 / 明刻</td><td>自己摸成的刻子／碰別人牌成的刻子。</td></tr>
<tr><td>平胡、碰碰胡、混一色、清一色…</td><td>各種牌型，見 <a href="/tai/">台數表</a>與 <a href="/patterns/">牌型圖解</a>。</td></tr>
</table>

<h2>計分</h2>
<table>
<tr><th>名詞</th><th>意思</th></tr>
<tr><td>底</td><td>不管台數，每次輸贏都有的基本金額。</td></tr>
<tr><td>每台</td><td>一台值多少錢。</td></tr>
<tr><td>連莊 / 拉莊</td><td>莊家贏（或流局）後繼續當莊；連莊的莊家要多算台數，「連 N 拉 N」。</td></tr>
<tr><td>下莊</td><td>閒家贏了，換下家當莊。</td></tr>
<tr><td>一將</td><td>打完東南西北四圈。</td></tr>
</table>
<p>規則介紹見 <a href="/rules/">基本規則</a>，算法見 <a href="/scoring/">台數怎麼算</a>。</p>
`,
    },
    {
      slug: 'settlement',
      title: '麻將結算怎麼分帳：用最少轉帳搞定',
      description: '麻將打完怎麼結算？把每個人的總輸贏整理成「誰付給誰多少」，讓轉帳次數盡量少，附算例與可貼到 LINE 的格式。',
      body: `
<p>打了一整晚，每個人輸贏不同。與其每把都互相給錢，不如記帳，最後<b>一次結算</b>。這篇說明怎麼算，以及怎麼讓轉帳次數少一點。</p>

<h2>一、先算每個人的總輸贏</h2>
<p>把每一把的輸贏按人加總。所有人的總輸贏相加<b>一定等於 0</b>（有人贏就有人輸），這可以用來檢查有沒有記錯：加起來不是 0，就表示某一把算錯或漏記了。</p>
<p>範例（四個人，單位：元）：</p>
${settleTable}
<p>加起來：300 ＋ 100 － 150 － 250 ＝ 0，沒問題。</p>

<h2>二、讓輸的人付給贏的人</h2>
<p>最直覺的做法是「輸的人付給贏的人」。要讓轉帳次數盡量少，可以這樣做：</p>
<ol>
<li>找<b>欠最多</b>的人，和<b>贏最多</b>的人。</li>
<li>欠的人付給贏的人，金額取兩者較小的那個。</li>
<li>其中有人付清或收滿了，就換下一位。重複到全部歸零。</li>
</ol>
<p>上面的範例這樣結算：</p>
${transferList}
<p>只要 ${transfers.length} 筆轉帳就結清了。這個方法能讓轉帳次數盡量少，但我不保證在所有情況下都是理論上最少。</p>

<h2>三、貼到群組</h2>
<p>結算結果整理成文字，貼到 LINE 群組，大家一看就懂，也能當作紀錄：</p>
<pre>${sample}</pre>

<h2>四、結算時的小提醒</h2>
<ul>
<li><b>先講好單位</b>：記的是「元」還是「點」，打完要不要換成現金。</li>
<li><b>中途換人怎麼算</b>：換人時最好先結算一次，新的人再從 0 開始，避免帳目混亂。</li>
<li><b>零頭怎麼處理</b>：如果有人不想轉很小的金額，可以事先約好四捨五入的規則。</li>
<li><b>留下紀錄</b>：貼一份結算文字到群組，之後有爭議可以回頭看。</li>
</ul>

<h2>用 App 自動結算</h2>
<p><a href="/">${SITE_NAME}</a>會自動記每把輸贏、累計每個人的總額，打完按「結算」就算好誰付給誰，還能一鍵複製成上面的文字。也可以產生房號，讓朋友一起看同一份戰績。</p>
<p>算法的細節見 <a href="/scoring/">台數怎麼算</a>。</p>
`,
    },
  ]
}
