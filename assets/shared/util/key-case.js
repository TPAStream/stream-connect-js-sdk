export const snakeToCamel = snakeCaseObj => {
  if (Object.prototype.toString.call(snakeCaseObj) === '[object Array]') {
    const parsed = [];
    for (const obj of snakeCaseObj) {
      parsed.push(snakeToCamel(obj));
    }
    return parsed;
  }
  if (snakeCaseObj !== Object(snakeCaseObj)) {
    return snakeCaseObj;
  }
  const ccObj = {};
  for (const key of Object.keys(snakeCaseObj)) {
    const keyArray = key.split('');
    let upperNext = false;
    let camelCaseKey = '';
    for (const [index, letter] of keyArray.entries()) {
      if (letter.charCodeAt(0) === 95) {
        if (index === 0) {
          camelCaseKey = letter;
        } else {
          upperNext = true;
        }
        continue;
      }
      if (upperNext) {
        upperNext = false;
        const charCode = letter.charCodeAt(0);
        if (charCode > 96 && charCode < 123) {
          camelCaseKey = `${camelCaseKey}${String.fromCharCode(
            letter.charCodeAt(0) - 32
          )}`;
        } else {
          camelCaseKey = `${camelCaseKey}${letter}`;
        }
      } else {
        camelCaseKey = `${camelCaseKey}${letter}`;
      }
    }
    ccObj[camelCaseKey] = snakeToCamel(snakeCaseObj[key]);
  }
  return ccObj;
};

export const camelToSnake = camelCaseObj => {
  if (Object.prototype.toString.call(camelCaseObj) === '[object Array]') {
    const parsed = [];
    for (const obj of camelCaseObj) {
      parsed.push(camelToSnake(obj));
    }
    return parsed;
  }
  if (camelCaseObj !== Object(camelCaseObj)) {
    return camelCaseObj;
  }
  const scObj = {};
  for (const key of Object.keys(camelCaseObj)) {
    let snakeCaseKey = '';
    for (const letter of key) {
      const charCode = letter.charCodeAt(0);
      if (charCode > 64 && charCode < 91) {
        snakeCaseKey = `${snakeCaseKey}_${String.fromCharCode(charCode + 32)}`;
      } else {
        snakeCaseKey = `${snakeCaseKey}${letter}`;
      }
    }
    scObj[snakeCaseKey] = camelToSnake(camelCaseObj[key]);
  }
  return scObj;
};
