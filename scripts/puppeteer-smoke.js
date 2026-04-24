const puppeteer = require("puppeteer");
const app = require("../src/app");

async function run() {
  const testPort = Number(process.env.PUPPETEER_TEST_PORT || 3100);
  const server = app.listen(testPort);
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    await page.goto(`http://localhost:${testPort}`, { waitUntil: "networkidle0" });
    await page.waitForSelector(".chat-pane");
    const panelCount = await page.$$eval(".chat-pane", (nodes) => nodes.length);
    if (panelCount !== 2) {
      throw new Error(`Expected exactly 2 windows, got ${panelCount}`);
    }

    await page.waitForSelector(".thread-item");
    await page.type(".chat-pane .composer-input", "Explain unit testing briefly.");
    await page.click(".chat-pane .send-btn");
    await page.waitForSelector(".msg.assistant");

    const assistantMessages = await page.$$eval(".msg.assistant", (nodes) => nodes.length);
    if (assistantMessages < 1) {
      throw new Error(`Expected at least 1 assistant response, got ${assistantMessages}`);
    }

    await page.waitForSelector(".pane-status");
    const paneStatus = await page.$eval(".pane-status", (node) =>
      node.textContent ? node.textContent.trim() : ""
    );
    if (!paneStatus) {
      throw new Error("Expected pane status text.");
    }

    console.log(
      `Puppeteer smoke test passed with ${assistantMessages} assistant responses. Pane status: ${paneStatus}`
    );
  } finally {
    await browser.close();
    server.close();
  }
}

run()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Puppeteer smoke test failed:", error.message);
    process.exit(1);
  });
