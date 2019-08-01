const challenges = [];

const challengeOne = {
  stepOne (payload) {
    return new Promise((resolve, reject) => {
      let failedAsExpected = false;
      const haltWithFeedback = haltAuditWith(reject);

      failedAsExpected = on('body')
        .ifThe('background-color', asHex, isNotEqual('#ffffff'))
        .tellMe();

      if (failedAsExpected) {
        haltWithFeedback(
          `The BODY element should have a WHITE background color.`
        );
      }

      const dataCartInfo = select('[data-cart-info]');
      if (!dataCartInfo) {
        haltWithFeedback(
          `You need to create a DIV having "data-cart-info" as an attribute `
        );
      }

      const heading = select('[data-cart-info] .mdc-typography--headline4');
      if (!heading) {
        haltWithFeedback(
          `As specified, you need to create a HEADING with a "mdc-typography--headline4" class`
        );
      }

      const spans = selectAll('.mdc-typography--headline4 span');
      if (spans.length !== 2) {
        haltWithFeedback(
          `You need to create two SPAN elements within the "mdc-typography--headline4" HEADING`
        );
      } else {
        const [first, second] = [...spans];
        if (
          !first.classList.contains('material-icons') ||
          trim(first.textContent) !== 'shopping_cart' ||
          !second.hasAttribute('data-bill')
        ) {
          haltWithFeedback(
            `Your SPAN elements within the "mdc-typography--headline4" HEADING are not as specified`
          );
        }
      }

      const dataCreditCard = select('[data-credit-card].mdc-card');
      if (!dataCreditCard) {
        haltWithFeedback(
          `You need to create a DIV having "data-credit-card" as an attribute`
        );
      }

      const dataCreditCardInner = select(
        '[data-credit-card].mdc-card .mdc-card__primary-action'
      );
      if (!dataCreditCardInner) {
        haltWithFeedback(
          `You need a ".mdc-card__primary-action" DIV within the "data-credit-card" DIV`
        );
      }

      const img = select('.mdc-card__primary-action [data-card-type]');
      if (!img || !img.src || img.src.indexOf('placehold.it/120x60') === -1) {
        haltWithFeedback(
          `You need to create the IMAGE element with the specified attributes`
        );
      }

      const dataCreditDigits = select('[data-cc-digits]');
      if (!dataCreditDigits) {
        haltWithFeedback(
          `You need to create a DIV having "data-cc-digits" as an attribute`
        );
      }

      const digitsFields = selectAll('[data-cc-digits] input[type="text"]');
      if (
        digitsFields.length !== 4 ||
        ![...digitsFields].every(f => {
          return (
            f.hasAttribute('size') &&
            parseInt(f.getAttribute('size'), 10) === 4 &&
            f.getAttribute('placeholder') === '----'
          );
        })
      ) {
        haltWithFeedback(
          `You need to create the specified INPUT elements within the "data-cc-digits" DIV`
        );
      }

      const dataCCInfor = selectAll('[data-cc-info]');
      if (!dataCCInfor) {
        haltWithFeedback(
          `As specfied, you need to create a DIV having "data-cc-info" as an attribute`
        );
      }

      const infoFields = selectAll('[data-cc-info] input[type="text"]');
      if (infoFields.length !== 2) {
        haltWithFeedback(
          'You need to create exactly 2 INPUT elements within the "data-cc-info" DIV. See instructions'
        );
      }

      const [name, expiry] = [...infoFields];
      if (
        !name.hasAttribute('size') ||
        name.getAttribute('placeholder') !== 'Name Surname' ||
        expiry.getAttribute('placeholder') !== 'MM/YY'
      ) {
        haltWithFeedback(
          `You need to create the specified INPUT elements within the "data-cc-info" DIV`
        );
      }

      const btn = select('[data-pay-btn].mdc-button');
      if (
        !btn || trim(btn.textContent) !== 'Pay Now'
      ) {
        haltWithFeedback(
          `As specified, create a BUTTON with a "data-pay-btn" attribute and the required content. See instructions`
        );
      }

      resolve(payload);
    });
  },

  stepTwo (payload) {
    return new Promise((resolve, reject) => {
      let failedAsExpected = false;
      const haltWithFeedback = haltAuditWith(reject);

      const [cart, bill] = [...selectAll('[data-cart-info] span')];
      const cartFailed = on(cart)
        .ifThe('display', asIs, isNotEqual('inline-block'))
        .ifThe('vertical-align', asIs, isNotEqual('middle'))
        .ifThe('font-size', asPixelsToInt, isNotEqual(150))
        .tellMe();

      const billFailed = on(bill)
        .ifThe('display', asIs, isNotEqual('inline-block'))
        .ifThe('vertical-align', asIs, isNotEqual('middle'))
        .tellMe();

      if (cartFailed || billFailed) {
        haltWithFeedback(
          'The SPAN elements within the "data-cart-info" DIV do not have the required CSS style'
        );
      }

      failedAsExpected = on('[data-credit-card]')
        .ifThe('width', asPixelsToInt, isNotEqual(435))
        .ifThe('min-height', asPixelsToInt, isNotEqual(240))
        .ifThe('border-radius', asIs, isNotEqual('10px'))
        .ifThe('background-color', asHex, isNotEqual('#5d6874'))
        .tellMe();

      if (failedAsExpected) {
        haltWithFeedback(
          'The "data-credit-card" DIV does not have the reauired CSS style'
        );
      }

      failedAsExpected = on('[data-card-type]')
        .ifThe('display', asIs, isNotEqual('block'))
        .ifThe('width', asPixelsToInt, isNotEqual(120))
        .ifThe('height', asPixelsToInt, isNotEqual(60))
        .tellMe();

      if (failedAsExpected) {
        haltWithFeedback(
          'The "data-card-type" IMAGE does not have the specified CSS'
        );
      }

      failedAsExpected = on('[data-cc-digits]')
        .ifThe('margin-top', asPixelsToInt, isNotEqual(32))
        .tellMe();

      if (failedAsExpected) {
        haltWithFeedback(
          'The "data-cc-digits" DIV does not have the specified CSS for margin.'
        );
      }

      const digitFields = selectAll('[data-cc-digits] input[type="text"]');
      failedAsExpected = [...digitFields].find(f => {
        return on(f)
          .ifThe('color', asHex, isNotEqual('#ffffff'))
          .ifThe('font-size', asPixelsToInt, isNotEqual(32))
          .ifThe('line-height', asPixelsToInt, isNotEqual(64))
          .ifThe('border', asIs, isNotEqual('0px none rgb(255, 255, 255)'))
          .ifThe('background-color', asIs, isNotEqual('rgba(0, 0, 0, 0)'))
          .ifThe('margin-right', asPixelsToInt, isNotEqual(16))
          .tellMe();
      });

      if (failedAsExpected) {
        haltWithFeedback(
          'One or more of the INPUT elements in the "data-cc-digits" DIV does not have the specified CSS.'
        );
      }

      failedAsExpected = on('[data-cc-info]')
        .ifThe('margin-top', asPixelsToInt, isNotEqual(16))
        .tellMe();

      if (failedAsExpected) {
        haltWithFeedback(
          'The "data-cc-info" DIV does not have the specified CSS for margin.'
        );
      }

      const infoFields = selectAll('[data-cc-info] input[type="text"]');
      failedAsExpected = [...infoFields].find(f => {
        return on(f)
          .ifThe('color', asHex, isNotEqual('#ffffff'))
          .ifThe('font-size', asPixelsToFloat, isNotEqual(19.2))
          .ifThe('border', asIs, isNotEqual('0px none rgb(255, 255, 255)'))
          .ifThe('background-color', asIs, isNotEqual('rgba(0, 0, 0, 0)'))
          .tellMe();
      });

      const expiryFailed = on(infoFields[1])
        .ifThe('padding-right', asPixelsToInt, isNotEqual(10))
        .ifThe('float', asIs, isNotEqual('right'))
        .tellMe();

      if (failedAsExpected || expiryFailed) {
        haltWithFeedback(
          'One or all of the INPUT elements in the "data-cc-info" DIV does not have the specified CSS.'
        );
      }

      failedAsExpected = on('[data-pay-btn]')
        .ifThe('position', asIs, isNotEqual('fixed'))
        .ifThe('width', asPixelsToInt, isNotEqual(324))
        .ifThe('bottom', asPixelsToInt, isNotEqual(20))
        .ifThe('border', asIs, isNotEqual('1px solid rgb(98, 0, 238)'))
        .tellMe();

      if (failedAsExpected) {
        haltWithFeedback(
          'The "data-pay-btn" BUTTON element does not have the specified CSS.'
        );
      }

      resolve(payload);
    });
  }
};
challenges.push(challengeOne);

const challengeTwo = {
  stepOne (payload) {
    return new Promise(async (resolve, reject) => {
      const { script } = payload;
      const haltWithFeedback = deferAuditHaltWith(reject);

      const declaresAppStateObject = createAudit(queryExpressionDeclaration, {
        name: 'appState',
        exprType: 'ObjectExpression'
      });

      const declaresFormatAsMoneyFn = createAudit(queryNamedArrowFnHasParams, {
        name: 'formatAsMoney',
        params: ['amount', 'buyerCountry']
      });

      const declaresDetectCardTypeFn = createAudit(queryNamedArrowFnHasParams, {
        name: 'detectCardType',
        params: ['first4Digits']
      });

      const declaresValidateCardExpiryDateFn = createAudit(
        queryNamedArrowFnHasParams,
        {
          name: 'validateCardExpiryDate'
        }
      );

      const declaresValidateCardHolderNameFn = createAudit(
        queryNamedArrowFnHasParams,
        {
          name: 'validateCardHolderName'
        }
      );

      const declaresUiCanInteractFn = createAudit(queryArrowFunction, {
        name: 'uiCanInteract'
      });

      const declaresDisplayCartTotalFn = createAudit(
        queryNamedArrowFnHasParams,
        {
          name: 'displayCartTotal',
          params: [
            {
              type: 'ObjectPattern',
              name: 'results'
            }
          ]
        }
      );

      const tests = [];
      tests.push(
        audit(declaresAppStateObject).and(
          haltWithFeedback(
            `You have not delcared "appState" as specified. See instructions`
          )
        )
      );

      tests.push(
        audit(declaresFormatAsMoneyFn).and(
          haltWithFeedback(
            `You have not declared "formatAsMoney" as specified. See instructions`
          )
        )
      );

      tests.push(
        audit(declaresDetectCardTypeFn).and(
          haltWithFeedback(
            `You have not declared "detectCardType" as specified. See instructions`
          )
        )
      );

      tests.push(
        audit(declaresValidateCardExpiryDateFn).and(
          haltWithFeedback(
            `You have not declared "validateCardExpiryDate" as specified. See instructions`
          )
        )
      );

      tests.push(
        audit(declaresValidateCardHolderNameFn).and(
          haltWithFeedback(
            `You have not declared "validateCardHolderName" as specified. See instructions`
          )
        )
      );

      tests.push(
        audit(declaresUiCanInteractFn).and(
          haltWithFeedback(
            `You have not declared "uiCanInteract" as specified. See instructions`
          )
        )
      );

      tests.push(
        audit(declaresDisplayCartTotalFn).and(
          haltWithFeedback(
            `You have not declared "displayCartTotal" as specified. See instructions`
          )
        )
      );

      const testSuite = chain(...tests);
      await auditJavascript(script, testSuite);

      resolve(payload);
    });
  },

  stepTwo (payload) {
    return new Promise(async (resolve, reject) => {
      const { script } = payload;
      const haltWithFeedback = deferAuditHaltWith(reject);

      const fetchBillFnDeclaresEndpoint = async ({ ast, astq }) => {
        try {
          const query = `
            //VariableDeclaration [
              @kind == 'const' &&
                /:declarations VariableDeclarator [
                  /:id Identifier [@name == 'fetchBill'] 
                  && /:init ArrowFunctionExpression [
                      /:body BlockStatement [
                        //VariableDeclaration [
                          @kind == 'const' &&
                          /:declarations VariableDeclarator [
                            /:id Identifier [@name == 'apiEndpoint']
                          ]
                      ]
                    ]
                ]
              ]
            ]
          `;

          const [node] = astq.query(ast, query);
          return node !== undefined;
        } catch (queryError) {}
      };

      const fetchBillAndDisplayCartTotal = async ({ ast, astq }) => {
        try {
          const query = `
          //VariableDeclaration [
            @kind == 'const' &&
            /:declarations VariableDeclarator [
              /:id Identifier [@name == 'fetchBill'] 
              && /:init ArrowFunctionExpression [
                /:body BlockStatement [
                  // CallExpression [
                    /:callee MemberExpression [
                      /:object CallExpression [
                        /:callee MemberExpression [
                          /:object CallExpression [
                            /:callee Identifier [@name == 'fetch']
                            && /:arguments Identifier [@name == 'apiEndpoint']
                          ]
                          && /:property Identifier [@name == 'then']	
                        ]
                          && /:arguments ArrowFunctionExpression [
                          /:params Identifier [@name == 'response']
                          && //MemberExpression [
                            /:object Identifier [@name == 'response']
                            && /:property Identifier [@name == 'json']
                          ]
                        ]
                      ]
                      && /:property Identifier [@name == 'then']
                    ]
                    && /:arguments ArrowFunctionExpression [
                        /:params Identifier [@name == 'data']
                        && //CallExpression [
                          /:callee Identifier [@name == 'displayCartTotal']
                          && /:arguments Identifier [@name == 'data']
                        ]
                      ]

                      || /:arguments Identifier [@name == 'displayCartTotal']
                  ]
                ]
              ]
            ]
          ]`;

          const [node] = astq.query(ast, query);
          return node !== undefined;
        } catch (queryError) {}
      };

      const startAppDelegatesCorrectly = async ({ ast, astq }) => {
        try {
          const query = `
            //VariableDeclaration [
                  @kind == 'const' &&
                  /:declarations VariableDeclarator [
                    /:id Identifier [@name == 'startApp'] 
                    && /:init ArrowFunctionExpression [
                    /:body BlockStatement [
                          //CallExpression [
                              /:callee Identifier [@name == 'fetchBill']
                          ]
                        ]
                    ]
              ]
            ]
          `;

          const [node] = astq.query(ast, query);
          return node !== undefined;
        } catch (queryError) {}
      };

      const tests = [];
      tests.push(
        audit(fetchBillFnDeclaresEndpoint).and(
          haltWithFeedback(
            `The "fetchBill" function is missing the "apiEndpoint" variable. Did your remove it?`
          )
        )
      );

      tests.push(
        audit(fetchBillAndDisplayCartTotal).and(
          haltWithFeedback(
            `You are not correctly using "fetchBill" to make a HTTP request, convert the response to JSON and then call "displayCartTotal" with the resulting JSON data. See instructions`
          )
        )
      );

      tests.push(
        audit(startAppDelegatesCorrectly).and(
          haltWithFeedback(
            `You are not invoking "fetchBill" from the "startApp" function to get the app running?. See instructions`
          )
        )
      );

      const testSuite = chain(...tests);
      await auditJavascript(script, testSuite);

      resolve(payload);
    });
  },

  stepThree (payload) {
    return new Promise(async (resolve, reject) => {
      const { script } = payload;
      const haltWithFeedback = deferAuditHaltWith(reject);

      const displayCartTotalDestructuresData = async ({ ast, astq }) => {
        try {
          const query = `
           //VariableDeclaration [
              @kind == 'const' &&
              /:declarations VariableDeclarator [
                /:id Identifier [@name == 'displayCartTotal'] 
                && /:init ArrowFunctionExpression [
                  /:body BlockStatement [
                      //VariableDeclarator [
                          /:id ArrayPattern //Identifier [@name == 'data']
                          && /:init Identifier [@name == 'results']
                      ]
                      && //VariableDeclarator [
                          /:id ObjectPattern [
                            //Identifier [@name == 'itemsInCart']
                            && //Identifier [@name == 'buyerCountry']
                          ]
                        && /:init Identifier [@name == 'data']
                      ]
                    ]
                  ]
              ]
            ]
          `;

          const [node] = astq.query(ast, query);
          return node !== undefined;
        } catch (queryError) {}
      };

      const canFormatAsMoney = async ({ ast, astq }) => {
        try {
          const query = `
            //VariableDeclaration [
              @kind == 'const' &&
                /:declarations VariableDeclarator [
                  /:id Identifier [@name == 'formatAsMoney'] 
                  && /:init ArrowFunctionExpression [
                      /:body BlockStatement [
                        // CallExpression /:callee MemberExpression [
                          /:object Identifier [@name == 'amount']
                          && /:property Identifier [@name == 'toLocaleString']
                        ]  
                    ]
                ]
              ]
            ]
          `;

          const [node] = astq.query(ast, query);
          return node !== undefined;
        } catch (queryError) {}
      };

      const setsAppStateAndCallsUiCanInteract = async ({ ast, astq }) => {
        try {
          const query = `
            //VariableDeclaration [
              @kind == 'const' &&
              /:declarations VariableDeclarator [
                /:id Identifier [@name == 'displayCartTotal'] 
                && /:init ArrowFunctionExpression [
                  /:body BlockStatement [
                    //AssignmentExpression [
                        /:left MemberExpression [
                          /:object Identifier [@name == 'appState']
                          && /:property Identifier [@name == 'items']
                        ] &&
                        /:right Identifier [@name == 'itemsInCart']
                      ] &&
                          
                      //AssignmentExpression [
                        /:left MemberExpression [
                          /:object Identifier [@name == 'appState']
                          && /:property Identifier [@name == 'country']
                        ]
                        && /:right Identifier [@name == 'buyerCountry']
                      ] &&
                          
                     //AssignmentExpression [
                        /:left MemberExpression [
                          /:object Identifier [@name == 'appState']
                          && /:property Identifier [@name == 'billFormatted']
                        ]
                        && /:right CallExpression /:callee Identifier [@name == 'formatAsMoney']
                      ] &&
                        
                      //AssignmentExpression [
                        /:left MemberExpression [
                          /:property Identifier [@name == 'textContent']
                        ]
                        && /:right MemberExpression [
                        /:object Identifier [@name == 'appState'] &&
                          /:property Identifier [@name == 'billFormatted']
                        ]
                      ] &&
                      //AssignmentExpression [
                        /:left MemberExpression [
                          /:object Identifier [@name == 'appState']
                          && /:property Identifier [@name == 'cardDigits']
                        ]
                        && /:right ArrayExpression
                      ] &&
                      // CallExpression /:callee Identifier [@name == 'uiCanInteract']
                    ]
                  ]
              ]
            ]
          `;

          const [node] = astq.query(ast, query);
          return node !== undefined;
        } catch (queryError) {}
      };

      const calculatesBillWithReduce = async ({ ast, astq }) => {
        try {
          const query = `
            //VariableDeclaration [
              @kind == 'const' &&
              /:declarations VariableDeclarator [
                /:id Identifier [@name == 'displayCartTotal'] 
                && /:init ArrowFunctionExpression [
                  /:body BlockStatement [
                     //AssignmentExpression [
                        /:left MemberExpression [
                          /:object Identifier [@name == 'appState'] &&
                          /:property Identifier [@name == 'bill']
                        ]
                        && /:right CallExpression /:callee MemberExpression [
                          /:object Identifier [@name == 'itemsInCart'] &&
                          /:property Identifier [@name == 'reduce']
                        ]
                      ]
                    ]
                  ]
              ]
            ]
          `;

          const [node] = astq.query(ast, query);
          return node !== undefined;
        } catch (queryError) {}
      };

      const tests = [];
      tests.push(
        audit(displayCartTotalDestructuresData).and(
          haltWithFeedback(
            `In "displayCartTotal", you are not destructuring the "results" parameter to "data" and also destructuring that to get "itemsInCart" and "buyerCountry"?. See instructions`
          )
        )
      );

      tests.push(
        audit(canFormatAsMoney).and(
          haltWithFeedback(
            `Your "formatAsMoney" function is not impemented as specified. See instructions`
          )
        )
      );

      tests.push(
        audit(setsAppStateAndCallsUiCanInteract).and(
          haltWithFeedback(
            `In "displayCartTotal", you are required to assign data to certain properties of "appState" and then invoke "uiCanInteract". See instructions`
          )
        )
      );

      tests.push(
        audit(calculatesBillWithReduce).and(
          haltWithFeedback(
            `In "displayCartTotal", given the items the user bought, you are to derive the total bill with the array ".reduce" function and assign it to "appState.bill". See instructions`
          )
        )
      );

      const testSuite = chain(...tests);
      await auditJavascript(script, testSuite);

      resolve(payload);
    });
  }
};
challenges.push(challengeTwo);

const challengeThree = {
  stepOne (payload) {
    return new Promise(async (resolve, reject) => {
      const { script } = payload;
      const haltWithFeedback = haltAuditWith(reject);

      haltWithFeedback('Keep impplementing your solution following the instructions. Grading of this challenge will be shipping soon.');

      resolve(payload);
    });
  },

  stepTwo (payload) {
    return new Promise(async (resolve, reject) => {
        const { script } = payload;
        const haltWithFeedback = haltAuditWith(reject);

        haltWithFeedback('Keep impplementing your solution following the instructions. Grading of this challenge will be shipping soon.');
  
        resolve(payload);
    });
  },

  stepThree (payload) {
    return new Promise(async (resolve, reject) => {
        const { script } = payload;
        const haltWithFeedback = haltAuditWith(reject);

        haltWithFeedback('Keep impplementing your solution following the instructions. Grading of this challenge will be shipping soon.');
  
        resolve(payload);
    });
  }
};
challenges.push(challengeThree);

const challengeFour = {
  stepOne (payload) {
    return new Promise(async (resolve, reject) => {
        const { script } = payload;
        const haltWithFeedback = haltAuditWith(reject);

        haltWithFeedback('Keep impplementing your solution following the instructions. Grading of this challenge will be shipping soon.');
  
        resolve(payload);
    });
  },

  stepTwo (payload) {
    return new Promise(async (resolve, reject) => {
        const { script } = payload;
        const haltWithFeedback = haltAuditWith(reject);

        haltWithFeedback('Keep impplementing your solution following the instructions. Grading of this challenge will be shipping soon.');
  
        resolve(payload);
    });
  },

  stepThree (payload) {
    return new Promise(async (resolve, reject) => {
        const { script } = payload;
        const haltWithFeedback = haltAuditWith(reject);

        haltWithFeedback('Keep impplementing your solution following the instructions. Grading of this challenge will be shipping soon.');
  
        resolve(payload);
    });
  }
};
challenges.push(challengeFour);

const audits = challenges.reduce((pool, challenge, index) => {
  const steps = Object.values(challenge);
  const start = index === 0 ? userBeganChallenges : pingPong;
  return [...pool, asyncChain(start, ...steps, userCompletedThisChallenge)];
}, []);

const gradr = asyncChain(...audits);

