const FAQ_SHEET = 'faq';
const FAQ_COLUMN_QUESTION = 1;
const FAQ_COLUMN_ANSWER = 2;
const FAQ_COLUMN_KEYWORDS = 3;
const FAQ_COLUMN_TRIGGER_ID = 4;
const FAQ_COLUMN_ADDDATE = 5;

const CONTENT_SHEET = 'content';
const HISTORY_SHEET = 'history';
const CODE_BLOCK = "```";

function doPost(e) {
    console.log('doPost', e);

    const response_url = e.parameter.response_url;
    ack(response_url, '');

    const text = `${e.parameter.text}`;

    // https://api.slack.com/interactivity/slash-commands
    if(e.parameter.command === '/slash-gas-add') {
      const input = text.split(' ');
      if(input.length != 3){
        return ContentService.createTextOutput("`/slash-gas-add [質問文] [回答文] [キーワード(カンマ区切り)]`の形で入力してください");
      }
      const q_text = input[0];
      const a_text = input[1];
      const keywords = input[2];

      const trigger_id = `${e.parameter.trigger_id}`;
      addFaq(q_text, a_text, keywords, trigger_id);
      analyzeFaq(keywords, trigger_id);
      return ContentService.createTextOutput(
        `FAQを登録しました :ok_woman:${CODE_BLOCK}\nQ. ${q_text}\nA. ${a_text}\n(${keywords})${CODE_BLOCK}`
        );
    }

    if(e.parameter.command === '/slash-gas-faq') {
      const answerData = searchFaq(text);
      addHistory(text, answerData[FAQ_COLUMN_TRIGGER_ID]);
      return ContentService.createTextOutput(
        `「${text}」という質問に近いFAQを紹介します`+
        `\n${CODE_BLOCK}Q. ${answerData[FAQ_COLUMN_QUESTION]}`+
        `\nA. ${answerData[FAQ_COLUMN_ANSWER]}${CODE_BLOCK}`
        );
    }

    // https://developers.google.com/apps-script/reference/content/content-service#methods
    return ContentService.createTextOutput();
}

/** FAQデータを追加 */
function addFaq(q_text, a_text, keywords, trigger_id){
  const data = [q_text, a_text, keywords, trigger_id, new Date()];
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(FAQ_SHEET);
  const dataRange = sheet.getRange(sheet.getLastRow() + 1, 1, 1, data.length);
  dataRange.setValues([data]);
}

/** 検索用FAQデータを更新 */
function analyzeFaq(keywords, trigger_id){
  const contentSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONTENT_SHEET);

  const keywordArray = keywords.split(',');
  for(keyword of keywordArray){
    const addData = [keyword, trigger_id];
    const addRange = contentSheet.getRange(contentSheet.getLastRow() + 1, 1, 1, addData.length);
    addRange.setValues([addData]);
  }
}
/** 検索用FAQデータを更新(すべて) */
function analyzeFaqAll(){
  // faqシート(コマンドや手で追加・更新がありうる) -> contentシート(スクリプトで上書き更新する)
  const contentSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONTENT_SHEET);
  contentSheet.getRange(2, 1, contentSheet.getLastRow(), 10).clear(); // 10は適当

  const inputSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(FAQ_SHEET);
  for(var rowNo = 2; rowNo <= inputSheet.getLastRow(); rowNo++){
    const inputData = inputSheet.getRange(rowNo, FAQ_COLUMN_KEYWORDS, 1, 2).getValues()[0];
    const keywordArray = inputData[0].toString().split(',');
    const trigger_id = inputData[1].toString();
    for(keyword of keywordArray){
      const addData = [keyword, trigger_id];
      const addRange = contentSheet.getRange(contentSheet.getLastRow() + 1, 1, 1, addData.length);
      addRange.setValues([addData]);
    }
  }
}

/** 質問履歴を登録 */
function addHistory(q_text, trigger_id){
  const data = [q_text, trigger_id, new Date()];
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(HISTORY_SHEET);
  const dataRange = sheet.getRange(sheet.getLastRow() + 1, 1, 1, data.length);
  dataRange.setValues([data]);
}

/** FAQを見つけて回答 */
function searchFaq(q_text){
  // 質問文からキーワードを抽出
  // https://takuya-1st.hatenablog.jp/entry/2016/04/02/145017
  const r=/[一-龠]+|[ぁ-ん]+|[ァ-ヴー]+|[a-zA-Z0-9\-]+|[ａ-ｚＡ-Ｚ０-９]+/g;
  const keywordArray = q_text.match(r);
  console.info(keywordArray);

  // キーワードからFAQを探す
  const contentSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONTENT_SHEET);
  const fullDatas = contentSheet.getDataRange().getValues();
  const results = [];
  for(keyword of keywordArray){
    const datas = fullDatas.filter(data => data[0] == keyword);
    Array.prototype.push.apply(results, datas);
  }

  // TODO もっともヒットしているFAQを特定
  const grouped = groupBy(results, item => item[1]);
  console.log(grouped);
  const trigger_id = '100';

  // trigger_idからFAQを取得
  const faqSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(FAQ_SHEET);
  const searchRange = faqSheet.getRange(2, FAQ_COLUMN_TRIGGER_ID, faqSheet.getLastRow());
  const finder = searchRange.createTextFinder(trigger_id);
  const first = finder.findNext();
  if(!first) {
    console.log("not found", trigger_id)
    return; // 見つからなかったら終わる
  }
  const index = first.getRowIndex();
  const answerData = faqSheet.getRange(index, 1, 1, FAQ_COLUMN_TRIGGER_ID).getValues()[0];
  return ['1初めにしたい'].concat(answerData);
}
// https://qiita.com/nagtkk/items/e1cc3f929b61b1882bd1
const groupBy = (array, getKey) =>
    array.reduce((obj, cur, idx, src) => {
        const key = getKey(cur, idx, src);
        if(obj[key]){
          obj[key] = 0;
        }
        obj[key] = Number(obj[key]) + 1;
        return obj;
    }, {});
function test(){
  console.log(searchFaq('aとbについて教えて'));
}

function ack(response_url, text){
  console.log(response_url, text);
  const options = {
    method: "post",
    contentType: "application/json",
    muteHttpExceptions: true,
    // payload: `{"text": "Hello GAS!! ${text}"}`
  };
  try{
    const response = UrlFetchApp.fetch(response_url, options);
    console.log(response.toString());
  } catch(e){
    console.log(e);
  }
}
