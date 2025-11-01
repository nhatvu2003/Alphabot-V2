import {
  readdirSync,
  statSync,
  unlinkSync,
  rmSync
} from "fs";

try {
  [
    "./data/cache/",
  ]
    .forEach(path => {
      const files = readdirSync(path);
      files.forEach(file => {
        const filePath = `${path}${file}`;
        if (statSync(filePath).isFile() && file != "README.txt" && file != "spam.txt" && file != "autorep.json") {
          unlinkSync(filePath);
        }
      });
    });
} catch (e) {
  console.error(e);
}
