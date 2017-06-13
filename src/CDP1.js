const CDP = require('chrome-remote-interface');
const {ChromeLauncher} = require('lighthouse/lighthouse-cli/chrome-launcher');

const cheerio = require('cheerio');

const launcher = new ChromeLauncher({
  port: 9222, // remote-debugging-port
  autoSelectChrome: false,
  additionalFlags: [
//   '--headless',
    '--disable-gpu'
  ]
});
launcher.run()
  .then(() => {

    CDP(async protocol => {
      const {Page, Runtime, DOM} = protocol;

      await Page.enable();
      await Runtime.enable();

      await Page.navigate({url: 'http://www.cyokodog.net/'});
      var source = (function(){
        document.addEventListener("DOMContentLoaded", function(){
          document.body.style.backgroundColor='red';
          alert(window.location.href);
          alert(document.body.innerHTML)
        });
      }).toString();
      Page.addScriptToEvaluateOnLoad({
        scriptSource: `(${source})()`
      });

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
