const CDP = require('chrome-remote-interface');
const {ChromeLauncher} = require('lighthouse/lighthouse-cli/chrome-launcher');

const cheerio = require('cheerio');

const launcher = new ChromeLauncher({
  port: 9222, // remote-debugging-port
  additionalFlags: [
    '--headless',
    '--disable-gpu'
  ]
});
launcher.run()
  .then(() => {

    CDP(async protocol => {
      const {Page, Runtime, DOM} = protocol;

      await Page.enable();
      await Runtime.enable();

      /**
       * Node.js から直接 DOM を得る
       */
      await Page.navigate({url: 'https://www.pxgrid.com/'});
      await Page.loadEventFired();
      const doc = await DOM.getDocument();
      const hero = await DOM.querySelector({
        nodeId: doc.root.nodeId,
        selector: '.pxg3-hero__text'
      });
      if (hero.nodeId) {
        const html = await DOM.getOuterHTML({
          nodeId: hero.nodeId
        });
        console.log('html', html); // { outerHTML: '...' }
      }

      protocol.close();
      launcher.kill();


    }).on('error', err => {
      throw Error('Cannot connect to Chrome:' + err);
    });
  })
  .catch(err => {
    return launcher.kill().then(
      () => { throw err; },
      console.error
    );
  });
