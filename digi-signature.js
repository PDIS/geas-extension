function signAsync(b, pin, type) {
  console.log("signAsync"); // XXX： 仍有 IO 同步問題，如拿此行可能導致失敗
  return new Promise((resolve, reject) => {
    getICToken().sign(
      b,
      pin,
      "SHA1",
      () => {
        let token = getICToken();
        if (0 != token.RetObj.RCode) {
          console.error(token.RetObj.RCode, token.RetObj.RMsg);
          reject(token.RetObj.RMsg);
        }
        console.log(type);
        console.log(token.RetObj.B64Signature);
        resolve(token.RetObj.B64Signature);
      },
      type,
    );
  });
}

export function sign(pin) {
  return new Promise((resolve, reject) => {
    let tbs = batchsign2.random;
    var b = btoa(tbs);
    console.log("b: " + b);
    console.log("pin: " + pin);
    //b = encodeURIComponent(b);

    const doSignStep2 = async function () {
      console.log("doSignStep2"); // XXX： 仍有 IO 同步問題，如拿此行可能導致失敗
      let pkcs1, pkcs7;
      try {
        pkcs1 = await signAsync(b, pin, "PKCS1");
        pkcs7 = await signAsync(b, pin, "PKCS7");
      } catch (e) {
        reject({ ok: false });
      }
      resolve({ ok: true, pkcs1: pkcs1, pkcs7: pkcs7 });
    };

    const doSignStep1 = function () {
      console.log("doSignStep1"); // XXX： 仍有 IO 同步問題，如拿此行可能導致失敗
      let token = getICToken();
      if (0 != token.RetObj.RCode) {
        console.error(token.RetObj.RCode, token.RetObj.RMsg);
        reject({ ok: false });
      }
      token.getSmartCardID(doSignStep2);
    };

    let token = getICToken();
    token.goodDay(doSignStep1);
  });
}
