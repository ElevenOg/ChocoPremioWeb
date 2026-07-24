const bcrypt = require("bcrypt");

bcrypt.hash("rancherosllanos2026", 12).then((hash) => {
  console.log(hash);
});