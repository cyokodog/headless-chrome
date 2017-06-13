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
       * 追加したスクリプトから値を得る
       */
      await Page.navigate({url: 'http://www.cyokodog.net/'});
      var source = (function(){
        return window.location.href;
      }).toString();
      await Page.loadEventFired();
      const result = await Runtime.evaluate({
        expression: `(${source})()`
      });
      console.log(result);

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
