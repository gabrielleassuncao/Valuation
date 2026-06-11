const DEFAULTS = {
  revenue: 1000000,
  growth: 50,
  margin: 20,
  discount: 30,
  perpetual: 3.5,
  cash: 1500000,
  debt: 500000
};

const $ = (id) => document.getElementById(id);

function formatBRL(value){
  const safe = Number.isFinite(value) ? value : 0;

  return safe.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function formatCompactBRL(value){
  if (!Number.isFinite(value)) return "R$ 0,00";

  if (Math.abs(value) >= 1000000) {
    return `R$ ${(value / 1000000).toFixed(1).replace(".", ",")}M`;
  }

  if (Math.abs(value) >= 1000) {
    return `R$ ${(value / 1000).toFixed(0)}K`;
  }

  return formatBRL(value);
}

function updateLabels(data){
  $("revenueText").textContent = formatCompactBRL(data.revenue);
  $("growthText").textContent = `${data.growth.toFixed(0)}%`;
  $("marginText").textContent = `${data.margin.toFixed(0)}%`;
  $("discountText").textContent = `${data.discount.toFixed(0)}%`;
  $("perpetualText").textContent = `${data.perpetual.toFixed(1).replace(".", ",")}%`;
}

function calculate(){
  const revenue = Number($("revenue").value);
  const growth = Number($("growth").value);
  const margin = Number($("margin").value);
  const discount = Number($("discount").value);
  const perpetual = Number($("perpetual").value);
  const cash = Number($("cash").value) || 0;
  const debt = Number($("debt").value) || 0;

  updateLabels({ revenue, growth, margin, discount, perpetual });

  const growthRate = growth / 100;
  const targetMargin = margin / 100;
  const discountRate = discount / 100;
  const perpetualRate = perpetual / 100;

  let pvFlows = 0;
  let yearFiveFCF = 0;
  const rows = [];

  for (let year = 1; year <= 5; year++) {
    const yearRevenue = revenue * Math.pow(1 + growthRate, year - 1);

    // A margem é escalada progressivamente para representar maturidade operacional.
    const yearMargin = targetMargin * (year / 5);
    const fcf = yearRevenue * yearMargin;
    const presentValue = fcf / Math.pow(1 + discountRate, year);

    pvFlows += presentValue;

    if (year === 5) yearFiveFCF = fcf;

    rows.push({
      year,
      revenue: yearRevenue,
      margin: yearMargin,
      fcf,
      presentValue
    });
  }

  let tvFuture = 0;

  if (discountRate > perpetualRate) {
    tvFuture = (yearFiveFCF * (1 + perpetualRate)) / (discountRate - perpetualRate);
  }

  const tvPresent = tvFuture / Math.pow(1 + discountRate, 5);
  const enterpriseValue = pvFlows + tvPresent;
  const equityValue = enterpriseValue + cash - debt;
  const tvShare = enterpriseValue > 0 ? (tvPresent / enterpriseValue) * 100 : 0;

  $("pvFlows").textContent = formatBRL(pvFlows);
  $("tvFuture").textContent = formatBRL(tvFuture);
  $("tvPresent").textContent = formatBRL(tvPresent);
  $("enterpriseValue").textContent = formatBRL(enterpriseValue);
  $("equityValue").textContent = formatBRL(equityValue);
  $("heroEquity").textContent = formatBRL(equityValue);
  $("explicitTotal").textContent = formatBRL(pvFlows);
  $("terminalTotal").textContent = formatBRL(tvPresent);

  $("tvShare").textContent = `${tvShare.toFixed(1).replace(".", ",")}% do Enterprise Value`;
  $("tvBar").style.width = `${Math.min(tvShare, 100)}%`;

  $("tvMessage").textContent = tvShare >= 80
    ? "O Terminal Value representa mais de 80% do valuation total. Isto indica extrema dependência de longo prazo — típico de startups em crescimento agressivo, mas arriscado caso as premissas sofram alterações de mercado."
    : "O Terminal Value representa uma parcela relevante do valuation, mas o valor do período explícito ainda tem peso importante. Isso torna a projeção menos dependente apenas da perpetuidade.";

  $("projectionTable").innerHTML = rows.map((row) => `
    <tr>
      <td>${row.year}</td>
      <td>${formatBRL(row.revenue)}</td>
      <td>${(row.margin * 100).toFixed(1).replace(".", ",")}%</td>
      <td>${formatBRL(row.fcf)}</td>
      <td>${formatBRL(row.presentValue)}</td>
    </tr>
  `).join("");
}

function resetSimulator(){
  Object.entries(DEFAULTS).forEach(([id, value]) => {
    $(id).value = value;
  });

  calculate();
}

["revenue", "growth", "margin", "discount", "perpetual", "cash", "debt"].forEach((id) => {
  $(id).addEventListener("input", calculate);
});

$("resetBtn").addEventListener("click", resetSimulator);

calculate();
