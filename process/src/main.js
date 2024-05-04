import { readFileSync } from "fs";
import * as cheerio from "cheerio";
import * as action from "@actions/core";

const report = action.getInput("report", { required: true });

const $ = cheerio.load(readFileSync(report, 'utf8'));

const info = $("h2:nth-of-type(1)");
const infoTable = info.next().next();

const results = $("h2:nth-of-type(2)");
const resultsTable = results.next().next();
resultsTable.find("tr > td > a")
  .each((_, a) => { $(a).replaceWith($(a).text()) });

const summary = $("h2:nth-of-type(3)");
const summaryTable = summary.next().next();
summaryTable.find("tr > td > a")
  .each((_, a) => { $(a).replaceWith($(a).text()) });

const problems = $("h2:contains('Problems')").map(function() {
  const title = $(this).contents().first().text().trimEnd();
  let contents = `<h2>${title}</h2>\n`;
  $(this).nextAll().each(function() {
    const next = $(this);
    if (next.is(".h_name")) {
      contents += `<h3>File: ${next.text()}</h3>\n`;
    } else if (next.is(".section")) {
      const type = $(".section").first().contents().get(3);
      // @ts-ignore
      contents += `<h4>${type?.childNodes?.[0]?.data}${type?.next?.data}</h4>`;
    } else if (next.is("div[id^='c_']")) {
      contents += `${next.find("table").first()}`;
    }
    return !next.is(".top_ref");
  });
  return $(contents);
}).toArray().join("\n");

const headers = $("a[name='Headers'] + h2 + hr + .h_list").text().replace(/.+/g, '- `$&`');

const sources = $("a[name='Sources'] + h2 + hr + .h_list").text().replace(/.+/g, '- `$&`');

action.setOutput('report', `
# ABI compatibility report

${info}
${infoTable}

${results}
${resultsTable}

${summary}
${summaryTable}

${problems}

## Public headers

${headers}

## Source files

${sources}
`);
