// 結算：把每個人的最終輸贏，換成「誰付給誰多少」，並讓轉帳次數盡量少。
// 作法：每次讓欠最多的人付給贏最多的人，付到其中一方清零為止。

/** @param {{id:string,name:string,total:number}[]} players 輸贏總和應為 0 */
export function settle(players) {
  const debtors = players.filter((p) => p.total < 0).map((p) => ({ ...p, left: -p.total }))
  const creditors = players.filter((p) => p.total > 0).map((p) => ({ ...p, left: p.total }))
  const transfers = []
  debtors.sort((a, b) => b.left - a.left)
  creditors.sort((a, b) => b.left - a.left)

  while (debtors.length && creditors.length) {
    const d = debtors[0]
    const c = creditors[0]
    const amount = Math.min(d.left, c.left)
    transfers.push({ from: d.name, to: c.name, amount })
    d.left -= amount
    c.left -= amount
    if (d.left === 0) debtors.shift()
    if (c.left === 0) creditors.shift()
    debtors.sort((a, b) => b.left - a.left)
    creditors.sort((a, b) => b.left - a.left)
  }
  return transfers
}

export function settlementText(title, results, transfers) {
  const fmt = (n) => (n > 0 ? `+${n}` : `${n}`)
  const lines = [`【${title}】結算`, ...results.map((r) => `${r.name}　${fmt(r.total)}`)]
  if (transfers.length) {
    lines.push('', '轉帳：', ...transfers.map((t) => `${t.from} → ${t.to}　${t.amount}`))
  } else {
    lines.push('', '大家打平，不用轉帳')
  }
  return lines.join('\n')
}
