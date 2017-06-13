const account = require("../.account.json");
// {
//   "qiita": {
//     "user": "user_name",
//     "pass": "password"
//   }
// }

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

launcher.run().then(() => {

  CDP(async protocol => {
    const {Page, Runtime} = protocol;

    await Page.enable();
    await Runtime.enable();

    // 画面遷移
    await Page.navigate({url: 'https://qiita.com'});

    // ロードを待つ
    await Page.loadEventFired();

    // ログイン処理
    const loginSrc = `
      document.querySelector('#identity').value = '${account.qiita.user}';
      document.querySelector('#password').value = '${account.qiita.pass}';
      document.querySelector('.landingLoginForm').submit();
    `;
    await Runtime.evaluate({expression: loginSrc});

    // ロードを待つ
    await Page.loadEventFired();

    // SPAの描画を待つ
    await sleep(3000);

    // HTMLを得る
    let result = await evaluate(() => {
      return document.body.innerHTML;
    });

    // リスト部分を抜き出す
    const $ = cheerio.load(result);
    const list = [];
    $('.streamContainer_streams .item-box-title h1 a').each((i, link) => {
      const $link = $(link);
      list.push({
        title: $link.text().trim(),
        url: $link.prop('href').trim()
      });
    });

    console.log(list);

    protocol.close();
    launcher.kill();

    async function sleep(time){
      return new Promise( resolve => {
        setTimeout(async function(){
          resolve();
        }, time);
      });
    }

    async function evaluate(f) {
      const str = f.toString();
      const result = await Runtime.evaluate({expression: `(${str})()`});
      return result.result.value;
    }

  }).on('error', err => {
    throw Error('Cannot connect to Chrome:' + err);
  });
}).catch(err => {
  return launcher.kill().then(
    () => { throw err; },
    console.error
  );
});

