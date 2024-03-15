import { sign } from "./digi-signature.js";

function init() {
  var script = document.createElement("script");
  script.src = "https://fido.moi.gov.tw//pt/assets/ChtICToken.js";
  document.head.appendChild(script);
  var pkilogin = document.getElementsByClassName("pkilogin")[0];
  var newElementHTML = '<input type="button" id="hicos" value="HiCOS登入">';
  if (pkilogin) {
    pkilogin.insertAdjacentHTML("afterend", newElementHTML);
    document.getElementById("hicos").addEventListener("click", loginClicked);
  }

  // register
  var registerHTML =
    '<input type="button" id="new-register" value="跨平台版卡號註冊">';
  var registerInputElem = document.querySelector(
    "body > div > div.content.clear_pdTop > div > form > div.btn > div.left > input",
  );
  if (registerInputElem) {
    registerInputElem.insertAdjacentHTML("afterend", registerHTML);
    document
      .getElementById("new-register")
      .addEventListener("click", registerClicked);
  }

  // sign
  var poolTable = document.querySelector("table#myTable");
  var signHTML = '<input type="button" id="sign-all" value="簽章">';
  if (poolTable) {
    poolTable.insertAdjacentHTML("afterend", signHTML);
    document.getElementById("sign-all").addEventListener("click", signClicked);
  }
}

function doLogin(token, pkcs1, pkcs7) {
  if (0 != token.RetObj.RCode) {
    console.error("Login failed");
    return false;
  }
  const req = {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
    },
    body: "action=checkLoginLock&f_id=",
  };
  fetch("/iftop/ajax_server/ajax_login.server.php", req);

  const requestOptions = {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      fun_name: "va_verify_p7",
      f_sysno: "EAS",
      p7: pkcs7 + pkcs1,
    }).toString(),
  };
  fetch("/iftop/ajax_server/ajax_pki.server.php", requestOptions)
    .then((response) => response.json())
    .then((data) => {
      console.log("data");
      console.log(data);
      if (data.flag) {
        window.location =
          "/eas/EA13R01.php?f_menuname=%E5%B7%A5%E4%BD%9C%E5%84%80%E8%A1%A8%E6%9D%BF";
      } else {
        alert(data.msg);
      }
    });
}

function doRegister(token, pkcs1, pkcs7) {
  if (0 != token.RetObj.RCode) {
    console.error("Register failed");
    return false;
  }
  console.log("pkcs7: " + pkcs7);

  const requestOptions = {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      action: "register",
      organ_code: "A29000000G", // TODO
      idcardno: document.querySelector('[name="f_idcardno"]').value, // TODO
      f_id: undefined,
      f_pw: undefined,
      cardno: a.SmrtCrdID[0],
      open_window: "Y",
      mode: "1",
      p7: pkcs7 + pkcs1,
    }).toString(),
  };
  fetch("/iftop/ajax_server/OP16T22_ajax.php", requestOptions)
    .then((response) => response.json())
    .then((data) => {
      console.log("data");
      console.log(data);
      if (data.flag) {
        // window.location = "/eas/EA13R01.php?f_menuname=%E5%B7%A5%E4%BD%9C%E5%84%80%E8%A1%A8%E6%9D%BF";
      } else {
        alert(data.msg);
      }
    });
}

async function loginClicked() {
  let pin = prompt("請輸入PIN碼", ""); // TODO: replace with <dialog>?

  let { ok, pkcs1, pkcs7 } = await sign(pin);

  if (!ok) {
    return false;
  }
  doLogin(getICToken(), pkcs1, pkcs7);
}

async function registerClicked() {
  let pin = prompt("請輸入PIN碼", ""); // TODO: replace with <dialog>?

  let { ok, pkcs1, pkcs7 } = await sign(pin);

  if (!ok) {
    return false;
  }
  doRegister(getICToken(), pkcs1, pkcs7);
}

var dataPool = {}, cardReading = false;
function signClicked() {
    let pin = prompt("請輸入PIN碼", ""); // TODO: replace with <dialog>?

    dataPool = {
        idx: {},
        case: {},
        pin: pin,
        x509: "",
        p7: "",
        inno: "",
        jobs: []
    };

    getICToken().goodDay(() => {
        cardReading = true;
        getCert(1, () => {
            let token = getICToken();
            if (0 != token.RetObj.RCode) {
                console.error(token.RetObj.RCode, token.RetObj.RMsg);
                console.log(token.RetObj);
            } else {
                dataPool.x509 = token.RetObj.Certificate;
                console.log('x509 get');
                cardReading = false;
            }
        });
    });

    $("input", $("table#myTable")).each(function () {
        var theId = "" + $(this).attr("id");
        var idParts = theId.split("_");
        if (idParts.length === 2) {
            if (!dataPool.idx[idParts[1]]) {
                dataPool.idx[idParts[1]] = {};
            }
            dataPool.idx[idParts[1]][idParts[0]] = $(this).val();
        }
    });
    const requestOptions = {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
            action: "get",
        }).toString(),
    };
    fetch("/iftwf/ajax_server/get_all_batch.php", requestOptions)
        .then((response) => response.json())
        .then((data) => {
            var k = "";
            for (k in dataPool.idx) {
                if (dataPool.idx[k]["shtno"]) {
                    dataPool.case[dataPool.idx[k]["shtno"]] = dataPool.idx[k];
                }
            }
            dataPool.jobs = data.batches;
            function nextSign() {
                if (dataPool.jobs.length == 0) return;
                if (dataPool.x509 == "" || cardReading) {
                    setTimeout(nextSign, 300);
                } else {
                    dataPool.inno = dataPool.jobs.shift();
                    console.log(dataPool.inno);
                    getICToken().goodDay(() => {
                        getICToken().getSmartCardID(() => {
                            getICToken().sign(
                                btoa(dataPool.inno),
                                dataPool.pin,
                                "SHA1",
                                () => {
                                    let token = getICToken();
                                    cardReading = false;
                                    if (0 != token.RetObj.RCode) {
                                        console.error(token.RetObj.RCode, token.RetObj.RMsg);
                                    } else {
                                        console.log('getting server token for ' + dataPool.inno);
                                        dataPool.p7 = token.RetObj.B64Signature;
                                        const requestOptions = {
                                            method: "POST",
                                            headers: {
                                                "Content-Type": "application/x-www-form-urlencoded",
                                            },
                                            body: new URLSearchParams({
                                                Op: 'get_batch_signs',
                                                Cardno: 'haha',
                                                PeriodFrom: 'haha',
                                                PeriodTo: 'haha',
                                                Inno: dataPool.inno,
                                                Orgno: batchsign2.orgno
                                            }).toString(),
                                        };
                                        fetch("/iftwf/webservice.php", requestOptions)
                                            .then((response) => response.json())
                                            .then((job) => {
                                                const requestOptions = {
                                                    method: "POST",
                                                    headers: {
                                                        "Content-Type": "application/x-www-form-urlencoded",
                                                    },
                                                    body: new URLSearchParams({
                                                        Op: 'set_inno_signs',
                                                        Cardno: 'haha',
                                                        Token: job.Token,
                                                        X509: dataPool.x509,
                                                        P7: dataPool.p7,
                                                        Inno: dataPool.inno,
                                                        Orgno: batchsign2.orgno,
                                                        Signs: JSON.stringify(job.Signs)
                                                    }).toString(),
                                                };
                                                fetch("/iftwf/webservice.php", requestOptions)
                                                    .then((response) => response.json())
                                                    .then((result) => {
                                                        console.log(result);
                                                        setTimeout(nextSign, 300);
                                                    });
                                            });

                                    }
                                },
                                "PKCS7"
                            );
                        });
                    });
                }
            }
            setTimeout(nextSign, 300);
        });
}

init();
