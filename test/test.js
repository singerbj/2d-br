/**
 * Adds 10 player to the scene
 */

const puppeteer = require('puppeteer')

;(async () => {
  const browser = await puppeteer.launch({
    defaultViewport: { width: 960, height: 540 }
  })

  const randomTime = () => {
    return Math.random() * 2000 + 2000
  };

  const goRight = async page => {
    await page.keyboard.up('D')
    await page.keyboard.down('A')
    await page.waitFor(randomTime())
  };

  const goLeft = async page => {
    await page.keyboard.up('A')
    await page.keyboard.down('D')
    await page.waitFor(randomTime())
  };

  const jump = async page => {
    await page.keyboard.down('W')
    await page.waitFor(randomTime())
    await page.keyboard.up('W')
  };

  const doStuff = async (page) => {
    try {
      await page.waitFor(randomTime())

      await goLeft(page)
      await jump(page)
      await goRight(page)
      await jump(page)
      await goLeft(page)
      await jump(page)
      await goRight(page)
      await jump(page)
      await goLeft(page)
      await jump(page)
      await goRight(page)
      await jump(page)
      await goLeft(page)
      await jump(page)
      await goRight(page)
      await jump(page)
      await goLeft(page)
      await jump(page)
      await goRight(page)
      await jump(page)

      await browser.close()
    } catch (error) {
      console.error(error.message)
    }
    process.exit()
  }

  for (let i = 0; i < 10; i++) {
    const page = await browser.newPage()
    await page.goto('http://localhost:1444/')
    doStuff(page)
    await page.waitFor(randomTime())
  }
})()
