/**
 * 📂 puppeteerOpenUrlsFromTxt.js
 *
 * Description:
 * - Lists all `.txt` files in the current working directory.
 * - Prompts the user to select one of them by number.
 * - Reads URLs line by line from the selected file.
 * - Opens each URL in a new page using the provided Puppeteer browser instance.
 *
 * 🔸 Parameters:
 * @param {Browser} browser - A connected Puppeteer Browser instance.
 *
 * 🔹 Usage:
 * const puppeteerOpenUrlsFromTxt = require('./puppeteerOpenUrlsFromTxt');
 * await puppeteerOpenUrlsFromTxt(browser);
 *
 * 💡 Note:
 * - Expected environment: CLI with access to stdin/stdout.
 * - URLs must be one per line in the `.txt` file.
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

// 📄 List available .txt files in current directory
function listTxtFiles() {
  const allFiles = fs.readdirSync(process.cwd());
  return allFiles.filter(file => file.endsWith('.txt'));
}

// 🔍 Read selected file and return cleaned URL lines
function getUrlsFromFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  return content.split('\n').map(line => line.trim()).filter(Boolean);
}

// 📦 Main selector logic
async function puppeteerOpenUrlsFromTxt(browser) {
  const txtFiles = listTxtFiles();

  if (txtFiles.length === 0) {
    console.log('⚠️ No .txt files found.');
    return;
  }

  console.log('📁 Available .txt files:');
  txtFiles.forEach((file, i) => console.log(`  [${i + 1}] ${file}`));

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  // 🎯 Ask user to pick a file by index
  rl.question('\n👉 Enter the number of the file to use: ', async (answer) => {
    rl.close();
    const selectedIndex = parseInt(answer.trim(), 10) - 1;

    if (selectedIndex < 0 || selectedIndex >= txtFiles.length) {
      console.log('❌ Invalid selection.');
      return;
    }

    const selectedFile = txtFiles[selectedIndex];
    const urls = getUrlsFromFile(path.join(process.cwd(), selectedFile));

    console.log(`📄 Selected ${selectedFile} with ${urls.length} URL(s)`);

    for (const url of urls) {
      try {
        const page = await browser.newPage();
        await page.goto(url, { waitUntil: 'load', timeout: 30000 });
        console.log(`✅ Opened URL: ${url}`);
      } catch (err) {
        console.error(`❌ Failed to open ${url}: ${err.message}`);
      }
    }
  });
}

module.exports = puppeteerOpenUrlsFromTxt;
