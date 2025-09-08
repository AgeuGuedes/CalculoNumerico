
const form = document.getElementById("bisection-form");
const btnClear = document.getElementById("btn-clear");
const output = document.getElementById("output");
const summaryBox = document.getElementById("summary");
const msgBox = document.getElementById("messages");
const tableWrapper = document.getElementById("table-wrapper");

/* mensagem colorida */
function pushMsg(text, type = "ok") {
  const div = document.createElement("div");
  div.className = `msg ${type}`;
  div.textContent = text;
  msgBox.appendChild(div);
}

/* multiplicação implícita */
function insertImplicitMultiplication(expr) {
  let s = expr;
  s = s.replace(/(\d)\s*(x|\()/gi, "$1*$2");
  s = s.replace(/(x|\))\s*(\d|\()/gi, "$1*$2");
  s = s.replace(/\)\s*(x)/gi, ")*$1");
  s = s.replace(/x\s*x/gi, "x*x");
  return s;
}

/* converter expressão para JS */
function toJS(expr) {
  let js = expr.trim();
  js = insertImplicitMultiplication(js);
  js = js.replace(/\^/g, "**");

  js = js
    .replace(/(\b)sin\(/gi, "$1Math.sin(")
    .replace(/(\b)cos\(/gi, "$1Math.cos(")
    .replace(/(\b)tan\(/gi, "$1Math.tan(")
    .replace(/(\b)abs\(/gi, "$1Math.abs(")
    .replace(/(\b)exp\(/gi, "$1Math.exp(")
    .replace(/(\b)ln\(/gi, "$1Math.log(")
    .replace(/(\b)log\(/gi, "$1Math.log(")
    .replace(/(\b)sqrt\(/gi, "$1Math.sqrt(");

  js = js
    .replace(/\bpi\b/gi, "Math.PI")
    .replace(/\be\b/g, "Math.E");

  return js;
}

/* cria f(x) */
function makeFunction(expr) {
  const js = toJS(expr);
  return new Function("x", `return (${js});`);
}

/* método da bissecção */
function bisection(f, a, b, tol, maxIt) {
  const steps = [];
  let fa = f(a), fb = f(b);
  if (fa * fb > 0) throw new Error("Bolzano falhou: f(a) e f(b) têm o MESMO sinal.");

  let k = 0, c, fc, err = Infinity;
  while (k < maxIt) {
    c = (a + b) / 2;
    fc = f(c);
    err = (b - a) / 2;

    steps.push({ k, a, b, c, fa, fb, fc, err });

    if (Math.abs(fc) < tol || err < tol) break;

    if (fa * fc < 0) {
      b = c; fb = fc;
    } else {
      a = c; fa = fc;
    }
    k++;
  }
  return { c, fc, k, steps, converged: Math.abs(fc) < tol || err < tol };
}

/* tenta achar um intervalo válido */
function autoBracketByScan(f, xmin=-10, xmax=10, step=0.5) {
  let x = xmin, fx = f(x);
  for (x = xmin + step; x <= xmax; x += step) {
    const fx2 = f(x);
    if (isFinite(fx) && isFinite(fx2) && fx * fx2 < 0) {
      return [x - step, x];
    }
    fx = fx2;
  }
  return null;
}

/* formatar */
function fmt(x, digits = 6) {
  if (!isFinite(x)) return String(x);
  return Number(x).toFixed(digits);
}

/* tabela */
function renderTable(steps) {
  let html = `<table><thead><tr>
      <th>k</th><th>a</th><th>b</th><th>c=(a+b)/2</th>
      <th>f(a)</th><th>f(b)</th><th>f(c)</th><th>erro≈(b−a)/2</th>
    </tr></thead><tbody>`;
  for (const s of steps) {
    html += `<tr>
      <td>${s.k}</td><td>${fmt(s.a)}</td><td>${fmt(s.b)}</td>
      <td>${fmt(s.c)}</td><td>${fmt(s.fa)}</td><td>${fmt(s.fb)}</td>
      <td>${fmt(s.fc)}</td><td>${fmt(s.err)}</td>
    </tr>`;
  }
  html += `</tbody></table>`;
  tableWrapper.innerHTML = html;
}

/* vírgula -> ponto */
function toNumber(val) {
  if (typeof val !== "string") return Number(val);
  return Number(val.replace(",", "."));
}

/* submit */
form.addEventListener("submit", (ev) => {
  ev.preventDefault();
  msgBox.innerHTML = "";
  tableWrapper.innerHTML = "";
  summaryBox.innerHTML = "";
  output.classList.add("hidden");

  try {
    const fx = document.getElementById("fx").value;
    let a = toNumber(document.getElementById("a").value);
    let b = toNumber(document.getElementById("b").value);
    const tol = Math.abs(toNumber(document.getElementById("tol").value));
    const maxit = parseInt(document.getElementById("maxit").value, 10);

    const f = makeFunction(fx);

    let fa = f(a), fb = f(b);
    if (fa * fb > 0) {
      const br = autoBracketByScan(f, -10, 10, 0.5);
      if (br) {
        [a, b] = br;
        pushMsg(`Intervalo ajustado automaticamente para [${a}, ${b}]`, "warn");
      } else {
        throw new Error("Não foi possível encontrar intervalo com troca de sinal em [-10,10].");
      }
    }

    const result = bisection(f, a, b, tol, maxit);

    summaryBox.innerHTML = `
      <p><strong>Raiz aproximada:</strong> <code>${fmt(result.c, 8)}</code></p>
      <p><strong>f(raiz):</strong> <code>${fmt(result.fc, 8)}</code></p>
      <p><strong>Iterações:</strong> <code>${result.k}</code> (máx: ${maxit})</p>
    `;

    if (result.converged) pushMsg("Convergiu por |f(c)| < ε ou (b−a)/2 < ε. ✅", "ok");
    else pushMsg("Parou pelo limite de iterações antes de atingir a tolerância. ⚠️", "warn");

    renderTable(result.steps);
    output.classList.remove("hidden");
  } catch (err) {
    pushMsg(err.message || String(err), "err");
    output.classList.remove("hidden");
  }
});

/* limpar */
btnClear.addEventListener("click", () => {
  document.getElementById("fx").value = "";
  document.getElementById("a").value = "";
  document.getElementById("b").value = "";
  msgBox.innerHTML = "";
  tableWrapper.innerHTML = "";
  summaryBox.innerHTML = "";
  output.classList.add("hidden");
});
