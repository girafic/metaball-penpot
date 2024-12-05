import "./style.css";

const searchParams = new URLSearchParams(window.location.search);
document.body.dataset.theme = searchParams.get("theme") ?? "light";

const rate = document.getElementById("rate");
const handleSize = document.getElementById("handleSize");
const create = document.getElementById("create");
const union = document.getElementById("union");

function debounce(func: Function, wait: number) {
  let timeout: number | null = null;
  return function executedFunction(...args: any[]) {
    const later = () => {
      timeout = null;
      func(...args);
    };
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
}

function updateMetaball() {
  const rateInput = document.getElementById("rate") as HTMLInputElement;
  const handleSizeInput = document.getElementById(
    "handleSize"
  ) as HTMLInputElement;
  const rate = parseInt(rateInput.value, 10);
  const handleSize = parseInt(handleSizeInput.value, 10);

  parent.postMessage(
    { pluginMessage: { type: "create-metaball", rate, handleSize } },
    "*"
  );
}

const debouncedUpdateMetaball = debounce(updateMetaball, 200);

if (rate) {
  rate.oninput = () => {
    const rateValue = document.getElementById("rateValue");
    if (rateValue) {
      rateValue.textContent = (rate as HTMLInputElement).value;
    }
    debouncedUpdateMetaball();
  };
}

if (handleSize) {
  handleSize.oninput = () => {
    const handleSizeValue = document.getElementById("handleSizeValue");
    if (handleSizeValue) {
      handleSizeValue.textContent = (handleSize as HTMLInputElement).value;
    }
    debouncedUpdateMetaball();
  };
}

if (create) {
  create.onclick = () => {
    updateMetaball();
  };
}

if (union) {
  union.onclick = () => {
    parent.postMessage({ pluginMessage: { type: "union" } }, "*");
  };
}

window.addEventListener("message", async (event) => {
  if (event.data.type === "theme") {
    document.body.dataset.theme = event.data.content;
  }
});
