# 🤖 Your Guide to Creating New Automation Tasks (for Everyone!)

Ever wished you had a little robot to do boring, repetitive things online? That's exactly what these "tasks" are for! This guide will help you create your own browser robots, even if you're not a coding wizard.

---

## 🌟 The Big Picture: What's a "Task"?

Think of a task as a recipe for your browser robot. Each recipe tells the robot:

*   **Where to go:** (Like "Go to Google.com")
*   **What to do there:** (Like "Click the 'Sign In' button" or "Type 'cute cats' into the search bar")
*   **How to act human:** (Like "Wait a few seconds before clicking" or "Scroll down slowly")

All your tasks will follow a simple structure, like filling out a form. We've already built the basic form (`BaseTask`), so you just fill in the blanks for your specific robot!

---

## 💡 Your Robot's Smartest Tool: The `@loggable` Decorator

To make creating tasks even easier and cleaner, we have a special tool called a **decorator**. Think of it as a power-up for your robot's methods.

### The `@loggable` Power-Up

When you add `@loggable` above a method (like `navigate`, `execute`, or `verify`), it automatically does two things for you:

1.  **Automatic Console Logging:** It logs to the console when the step starts, finishes, or fails. You no longer need to write `this.logger(...)` at the beginning and end of your methods!
2.  **Automatic Monitoring Updates:** It sends real-time progress updates to the monitoring dashboard, so you can see exactly what your robot is doing, step-by-step.

**How to use it:**

```typescript
import { loggable } from '../utils/decorators';

class MyNewRobot extends BaseTask<...> {

  @loggable
  async navigate(_data: any): Promise<void> {
    // Your navigation logic here, without any manual logging.
    await this.page.goto('https://example.com');
  }

  @loggable
  async execute(_data: any): Promise<void> {
    // Your core task logic here.
    await this.findAndClick(['#my-button'], 'my button');
  }
}
```

By using `@loggable`, your task code becomes incredibly clean and focused only on the automation steps.

---

## 🛠️ Your Robot's Toolbox: Simple Commands You Can Use

Your robot has some super useful commands built-in. You'll use these a lot!

### 1. `this.navigate(whereToGo)`: Go to a Webpage!
*   **What it does:** Tells your robot to open a specific website.
*   **Example:** `this.navigate('https://www.youtube.com');` (Goes to YouTube)
*   **Creative Idea:** Make a task that visits your favorite news sites every morning!

### 2. `this.findAndClick(whatToClick, "What it is")`: Find and Click!
*   **What it does:** Finds a button, link, or any clickable thing on the page and clicks it.
*   **`whatToClick` (The "Address"):** This is super important! It's how you tell the robot *exactly* where the button is. Think of it like giving directions. (More on this below!)
*   **`"What it is"` (Your Note):** A simple description for yourself, like "Login button" or "Next page link."
*   **Example:** `this.findAndClick(['#loginButton', 'text=Sign In'], 'the login button');`
*   **Creative Idea:** Make a task that clicks through a photo gallery or accepts all cookies.

### 3. `this.automation.delay('howLong')`: Make Your Robot Wait!
*   **What it does:** Makes your robot pause, just like a human would. This helps avoid looking like a speedy robot!
*   **`'howLong'` options:** You can use predefined words or custom numbers:
    *   **Predefined words:** 
        *   `'short'`: A quick blink (a few hundred milliseconds).
        *   `'medium'`: A short thought (about 1-2 seconds).
        *   `'long'`: A longer pause (about 2-3 seconds).
        *   `'reading'`: A very long pause (like 2-3 minutes) for when your robot needs to "read" something.
    *   **Custom numbers (all interpreted as SECONDS, then converted to milliseconds):**
        *   **Single number:** `await this.automation.delay('1');` (Waits 1 second)
        *   **Single number with 's':** `await this.automation.delay('0.5s');` (Waits 0.5 seconds = 500 milliseconds)
        *   **Range:** `await this.automation.delay('2-5');` (Waits randomly between 2 and 5 seconds)
        *   **Range with 's':** `await this.automation.delay('0.1-0.3s');` (Waits randomly between 0.1 and 0.3 seconds = 100-300 milliseconds)
*   **Example:** `await this.automation.delay('medium');` or `await this.automation.delay('3-7s');`
*   **Creative Idea:** Add delays after every action to make your robot super stealthy.

### 4. `(this.page as any).humanType(whereToType, "Your Text")`: Type Like a Human!
*   **What it does:** Types text into a text box, but with human-like speed and even tiny "typos" sometimes!
*   **`whereToType` (The "Address"):** Just like `whatToClick`, this tells the robot which text box to use.
*   **`"Your Text"`:** The actual words you want the robot to type.
*   **Example:** `await (this.page as any).humanType(['#searchBox'], 'my awesome search');`
*   **Creative Idea:** Make a task that fills out a form or posts a comment.

### 5. `(this.page as any).humanScroll('direction', amount)`: Scroll the Page!
*   **What it does:** Moves the webpage up or down, just like you would with your mouse wheel.
*   **`'direction'` options:**
    *   `'down'`: Scroll towards the bottom.
    *   `'up'`: Scroll towards the top.
*   **`amount` (How Much):** How many pixels (tiny dots on the screen) to scroll. A bigger number means scrolling further.
*   **Example:** `await (this.page as any).humanScroll('down', 800);` (Scrolls down 800 pixels)
*   **Creative Idea:** Make a task that scrolls through an endless feed or finds a specific item far down a page.

---

## 🗺️ Understanding "Addresses" (Selectors) for `findAndClick` and `humanType`

This is the trickiest part, but once you get it, you're golden! A "selector" is like a unique street address for an element on a webpage.

**Why multiple addresses?** Websites change! A button's address might change. By giving your robot a list of possible addresses (e.g., `['address1', 'address2', 'address3']`), it can try each one until it finds the right element.

Here are the best ways to find an element's address:

1.  **By ID (`#`): The House Number (Most Reliable!)**
    *   If an element's code looks like `<button id="submitButton">`, its address is `#submitButton`.
    *   **Example:** `['#submitButton']`
    *   **Tip:** Always look for an `id` first! It's usually unique.

2.  **By Test ID (`[data-testid="..."]`): The Secret Code (Super Reliable!)**
    *   Sometimes developers add special `data-testid` attributes for automation. If you see `<input data-testid="username-field">`, its address is `[data-testid="username-field"]`.
    *   **Example:** `['[data-testid="username-field"]']`
    *   **Tip:** If available, use these! They are made for robots.

3.  **By Role and Name (`getByRole`): What a Human Sees (Very Reliable!)**
    *   This is a smart way to find elements based on what they *are* (like a "button" or "link") and what text they *show*.
    *   **Example:** `['getByRole("button", { name: "Sign In" })']` (Finds a button that says "Sign In")
    *   **Tip:** Great for finding common elements like buttons, links, or checkboxes.

4.  **By Visible Text (`text=` or `getByText`): What You Read (Good for Simple Text)**
    *   If you just want to find something by the words on it.
    *   **Example:** `['text=Continue', 'getByText("Next Step")']`
    *   **Tip:** Be careful if the same words appear many times on the page.

5.  **By Placeholder (`getByPlaceholder`): Text in Empty Boxes**
    *   For input boxes that show example text before you type.
    *   **Example:** `['getByPlaceholder("Enter your email")']`
    *   **Tip:** Useful for login forms or search bars.

6.  **By Class Name (`.`): The Street Name (Use with Caution)**
    *   If an element's code looks like `<div class="product-card">`, its address is `.product-card`.
    *   **Example:** `['.product-card']`
    *   **Tip:** Many elements can share a class, so it might not be unique. Use with other selectors if possible.

**How to find these addresses?**
*   **Right-click** on the element in your browser.
*   Choose **"Inspect"** or **"Inspect Element"**.
*   Look at the code that appears. You'll see `id=`, `class=`, `data-testid=`, or the text inside the element.

**A Practical Guide: Finding Selectors with Browser DevTools**

The best way to get reliable selectors is to use your browser's built-in Developer Tools. Here’s how:

1.  **Open DevTools:** On the webpage where you want to automate a task, right-click on the element (e.g., a button, a text box) and select **"Inspect"** from the context menu. This will open the DevTools panel, highlighting the element's HTML code.

2.  **Find a Good Selector:** Look at the highlighted line of code.
    *   **Best:** Look for an `id` attribute (e.g., `id="main-login-button"`). This is the most reliable selector. The selector would be `#main-login-button`.
    *   **Good:** Look for a `data-testid` attribute (e.g., `data-testid="profile-submit"`). This is also very reliable. The selector would be `[data-testid="profile-submit"]`.
    *   **Okay:** Look for a `class` attribute. A unique class name can work well. If you see `class="btn btn-primary btn-submit"`, you could use `.btn-submit`. Be warned: many elements can share the same class.

3.  **Copy the Selector:**
    *   Right-click on the highlighted HTML element in the DevTools.
    *   Go to **Copy** > **Copy selector**.
    *   This will copy a CSS selector to your clipboard (e.g., `#main-content > div > form > input`).

4.  **Test the Selector:**
    *   While still in DevTools, press `Ctrl+F` (or `Cmd+F` on Mac) to open the search bar within the Elements panel.
    *   Paste the selector you copied.
    *   The tool will show you how many elements match. **Ideally, you want "1 of 1"**. If it matches more than one element, the selector is not unique and might cause your robot to click the wrong thing.

5.  **Refine if Necessary:** If your selector is not unique or looks very complex and fragile (e.g., `div > div:nth-child(3) > ...`), try to find a better one by looking for `id`, `data-testid`, or a more unique combination of classes on the element or its parent.

By following these steps, you can create a robust list of selectors for your task, making your automation much more reliable.

---

## 📝 Step-by-Step: Creating Your Own Task Robot!

Ready to build your own robot? Follow these simple steps:

### Step 1: Make a New Robot File
*   Go to the `src/tasks` folder.
*   Create a new file, for example, `myNewRobot.ts`. (The `.ts` means it's a TypeScript file, which is like a smart way to write code.)

### Step 2: Copy the Basic Robot Blueprint
*   Open `src/tasks/taskExample.ts`. This is your best friend! It has all the basic parts you need.
*   **Copy everything** from `taskExample.ts` into your new `myNewRobot.ts` file.

### Step 3: Give Your Robot a Name
*   **Change the Class Name:** Find `class TaskExample` and change `TaskExample` to something unique, like `class MyNewRobot`.
*   **Change the Robot Type:** Find `export const type = 'taskExample';` and change `taskExample` to your robot's unique type, like `export const type = 'myNewRobot';`.

### Step 4: Teach Your Robot What to Do (Fill in the Blanks!)

Your robot blueprint has several sections (called "methods"). You need to tell your robot what to do in each of these. Remember to add the `@loggable` decorator above each lifecycle method (`navigate`, `verifyLogin`, `isAlreadyCompleted`, `execute`, `verify`) to enable automatic logging and monitoring!

*   **`getTaskName()`**:
    *   **Your Job:** Give your robot a short, clear name.
    *   **Example:** `return 'MyNewRobot';`
*   **`getTaskIdentifier(_data)`**:
    *   **Your Job:** How will you know *which* specific thing your robot is working on? If it's a Twitter robot, maybe it's the username. If it's a shopping robot, maybe it's the product name.
    *   **Example:** `return _data;` (If `_data` is the main thing, like a username)
*   **`async navigate(_data)`**: (Don't forget `@loggable`!)
    *   **Your Job:** Tell your robot which website to visit first.
    *   **Example:** `await this.page.goto('https://my-awesome-blog.com');`
*   **`async verifyLogin()`**: (Don't forget `@loggable`!)
    *   **Your Job:** Does your robot need to be logged in? If so, how can it check?
    *   **Example:** `// No login needed, so this can be empty.`
*   **`async isAlreadyCompleted(_data)`**: (Don't forget `@loggable`!)
    *   **Your Job:** Has your robot already finished this specific job before?
    *   **Example:** `return false;` (If you always want it to run, or you'll check later)
*   **`async execute(_data)`**: (Don't forget `@loggable`!) **This is the heart of your robot!**
    *   **Your Job:** This is where you put all the commands from the "Toolbox" section above. Tell your robot to click, type, scroll, and wait!
    *   **Example (Creative Idea: Auto-Liking Instagram Posts):**
        ```typescript
        await (this.page as any).humanScroll('down', 1500); // Scroll down a bit
        await this.automation.delay('medium'); // Wait a moment

        await this.findAndClick(['[aria-label="Like"]', 'button[type="submit"]'], 'like button');
        await this.automation.delay('short'); // Quick pause after liking
        ```
*   **`async verify(_data)`**: (Don't forget `@loggable`!)
    *   **Your Job:** After your robot tries to do its job, how can it check if it *really* succeeded?
    *   **Example:** `if (this.page.url().includes('success-page')) { return { success: true }; } else { return { success: false, error: 'Didn\'t reach success page.' }; }`

### Step 5: Tell the Main System About Your New Robot (The Easy Way!)

Previously, you had to manually edit a file to register your new task. Now, it's fully automated!

*   **Open your terminal** in the project's root directory.
*   **Run the following command:**
    ```bash
    npm run update-tasks
    ```
*   That's it! The system will automatically find your new robot and make it available for use.

### Step 6: Give Your Robot Instructions (in `config/tasks.json`)

*   Open `config/tasks.json`.
*   Add a new entry for your robot. This is where you give it specific details for its job.
    ```json
    {
      "type": "myNewRobot",
      "options": {
        "targetUrl": "https://www.instagram.com/explore/",
        "scrollAmount": 2000
        // ... any other custom options your robot needs
      },
      "stopOnTaskFailure": true // If this robot fails, stop everything for this profile
    }
    ```

---

## 💡 Super Tip: `taskExample.ts` is Your Playground!

Always look at `src/tasks/taskExample.ts`! It's a working example that shows you how to use all these commands. You can copy it, change it, and play around to see how things work.

---

## 📚 Detailed Explanation of Task Parameters and Options

This section explains the various inputs you can use when creating and configuring your tasks.

### 1. `_data` Parameter (What Your Task Operates On)

Many task methods (like `navigate`, `execute`, `verify`, `getTaskIdentifier`) take a `_data` parameter.
*   **What it is:** This is the main piece of information your task needs to do its job.
*   **Example:**
    *   For a "Follow Twitter User" task, `_data` might be the Twitter username (e.g., `"elonmusk"`).
    *   For a "Join Discord Server" task, `_data` might be the Discord invite link (e.g., `"https://discord.gg/invitecode"`).
    *   For a "Read Gmail" task, `_data` might not be directly used, so it could be `null`.
*   **How to use:** You define what `_data` means for your specific task.

### 2. `this.options` (Custom Settings for Your Task)

Every task can have its own custom settings, defined in `TaskOptions` (or a more specific version like `TaskExampleOptions`). These are set in `config/tasks.json`.

#### Common `TaskOptions` (from `src/types/tasks.ts`):

*   **`verifyOnly?: boolean`**
    *   **What it is:** If `true`, the task will only run its `verify` step and skip the `execute` step. Useful for just checking if something is already done.
    *   **Example in `config/tasks.json`:** `"verifyOnly": true`
*   **`delayBetweenActions?: boolean`**
    *   **What it is:** If `true`, the task will automatically add small, human-like pauses between major actions (like navigating and clicking).
    *   **Example in `config/tasks.json`:** `"delayBetweenActions": false`

#### Example `TaskExampleOptions` (from `src/tasks/taskExample.ts`):

These are specific to the `taskExample` but show how you can add your own options.

*   **`targetUrl: string`**
    *   **What it is:** The website address the task should go to.
    *   **Example in `config/tasks.json`:** `"targetUrl": "https://www.google.com"`
*   **`searchQuery: string`**
    *   **What it is:** The text to type into a search box.
    *   **Example in `config/tasks.json`:** `"searchQuery": "Playwright automation"`
*   **`elementToClick: string[]`**
    *   **What it is:** An array of "selectors" (addresses) for the button or link to click.
    *   **Example in `config/tasks.json`:** `"elementToClick": ["button[name='btnK']", "input[type='submit']"]`
    *   **See also:** The "What kind of selector can I use?" explanation for more details on selectors.
*   **`elementToType: string[]`**
    *   **What it is:** An array of "selectors" (addresses) for the text box to type into.
    *   **Example in `config/tasks.json`:** `"elementToType": ["textarea[name='q']", "input[name='q']"]`
    *   **See also:** The "What kind of selector can I use?" explanation for more details on selectors.
*   **`scrollAmount?: number`**
    *   **What it is:** How many pixels to scroll the page by.
    *   **Example in `config/tasks.json`:** `"scrollAmount": 500`

### 3. `this.navigate(yourURL)` (Going to a Webpage)

*   **`yourURL: string`**
    *   **What it is:** The full web address (e.g., `"https://www.example.com/page"`).
    *   **How to use:** You usually get this from `this.options.targetUrl` or from the `_data` parameter of your task.

### 4. `this.findAndClick(yourElement, "Description")` (Finding and Clicking)

*   **`yourElement: string[]`**
    *   **What it is:** An array of "selectors" (addresses) that tell the browser how to find the element.
    *   **How to use:** Provide one or more selectors. The system will try them in order until it finds a visible element.
    *   **See also:** The "What kind of selector can I use?" explanation for detailed examples.
*   **`"Description": string`**
    *   **What it is:** A short, human-readable label for what you're clicking. This helps with logging and understanding what the automation is doing.
    *   **Example:** `"search button"`, `"follow button"`, `"accept invite"`

### 5. `this.automation.delay('howLong')` (Making the Browser Wait)

*   **`'howLong': string`**
    *   **What it is:** This tells your robot how long to pause. You can use predefined words or custom numbers.
    *   **Predefined words:** 
        *   `'short'`: A very brief pause (e.g., 100-500 milliseconds).
        *   `'medium'`: A moderate pause (e.g., 500-1500 milliseconds).
        *   `'long'`: A longer pause (e.g., 1500-3000 milliseconds).
        *   `'reading'`: A very long pause (e.g., 2-3 minutes), used to simulate a human reading content.
    *   **Custom numbers (all interpreted as SECONDS, then converted to milliseconds):**
        *   **Single number:** `await this.automation.delay('1');` (Waits 1 second)
        *   **Single number with 's':** `await this.automation.delay('0.5s');` (Waits 0.5 seconds = 500 milliseconds)
        *   **Range:** `await this.automation.delay('2-5');` (Waits randomly between 2 and 5 seconds)
        *   **Range with 's':** `await this.automation.delay('0.1-0.3s');` (Waits randomly between 0.1 and 0.3 seconds = 100-300 milliseconds)
    *   **How to use:** Choose the profile or custom value that best fits the human-like pause you want to simulate.

### 6. `(this.page as any).humanType(yourTextBox, "Your Text")` (Typing into a Box)

*   **`yourTextBox: string[]`**
    *   **What it is:** An array of "selectors" (addresses) for the text input field you want to type into.
    *   **How to use:** Similar to `yourElement` in `findAndClick`, provide one or more selectors.
    *   **See also:** The "What kind of selector can I use?" explanation for detailed examples.
*   **`"Your Text": string`**
    *   **What it is:** The actual text you want the browser to type.
    *   **Example:** `"hello world"`, `"myusername"`

### 7. `(this.page as any).humanScroll('down'|'up', amount)` (Scrolling the Page)

*   **`'down' | 'up': string`**
    *   **What it is:** The direction you want the page to scroll.
    *   **How to use:** Choose `"down"` to scroll towards the bottom of the page, or `"up"` to scroll towards the top.
*   **`amount: number`**
    *   **What it is:** How many pixels the page should scroll in the specified direction.
    *   **Example:** `500` (scrolls 500 pixels), `1000` (scrolls 1000 pixels).

---