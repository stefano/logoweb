/*
 * Testing framework
 */

function tests (tests, cathcp) {
  var results = '<ul>';
  var ntests = 0;
  var nsucc = 0;
  
  var test1 = function (fn, res) {
    var out = '<li>' + fn + ' => ';
    var got;
    if (cathcp) {
      try {
        got = fn.call(this);
      } catch (e) {
        got = e;
      }
    } else {
      got = fn.call(this);
    }
    ntests++;
    if (got && res.toString() == got.toString()) {
      out += '<span style="color: green;"> ok </span> </li>';
      nsucc++;
    } else {
      out += '<span style="color: red;"> failed </span> </li>';
      out += '<div style="padding-left: 20px;"> Expected ' + res + ' but got ' + got + '</div>';
    }
    return out;
  };
  tests.each(function (test) {
               results += test1.apply(this, test);
             });
  results += '</ul>';
  results += '<p> Summary: ' + nsucc + '/' + ntests + ' succeded </p>';
  document.body.innerHTML += results;
}

// call testing function test with args as data
function test_with_data (test, args) {
  var res = args.map(function (arg) {
                       return [function () {
                                 return test.call(this, arg[0]);
                               }, arg[1]];
                     });
  tests(res);
}

/*
 * Tests
 */

function lexer_tests () {
  test_with_data(lex_input,
                 [
                   ['', []],
                   ['aa bb 7 9.8 9.7a', ['aa', 'bb', '7', '9.8', '9.7']]
                 ]);
}

/*
 * Parser tests
 */

function parser_tests () {
  // test grammar
  var gram;
  gram = new Grammar().init(
    [['e', ['atom', 0]],
     ['e', ['atom', function (x) { return x==1; }]],
     ['p', ['atom', '+']],
     ['e', ['+']],
     ['+', ['e', 'p', 'e']]]);
  
  tests([[function () {
            var p1 = new Parse();
            p1.name = 'n1';
            var p2 = new Parse();
            p2.name = 'n2';
            return p1.name;
          }, 'n1'],
         
         [function () { return gram.rules.length; }, 5],
         [function () { return gram.rules[0].rhs.match(0); }, true],
         [function () { return gram.rules[2]; }, 'p ::= +'],
         [function () { return gram.all_terminals('0'); }, 
          ['e ::= 0']],
         [function () { return gram.start_with_rule('e'); }, ['+ ::= e p e']]]);
  test_with_data(function (x) {
                   return gram.do_parse(x);
                 },
                 [
                   [['0'], ['e(0 : 1)']],
                   [['1', '+'], []],
                   [['1', '+', '1'], 
                    ['e(+(e(1 : 1) p(+ : 2) e(1 : 3) : 3) : 3)']],
                   [['1', '+', '0', '+', '1'],
                    ['e(+(e(1 : 1) p(+ : 2) e(+(e(0 : 3) p(+ : 4) e(1 : 5) : 5) : 5) : 5) : 5)', 'e(+(e(+(e(1 : 1) p(+ : 2) e(0 : 3) : 3) : 3) p(+ : 4) e(1 : 5) : 5) : 5)']]
                 ]);
}

function test_logo_gram() {
  test_with_data(function (x) {
                   return logo_grammar.do_parse(lex_input(x));
                 },
                 [
                   ['0 ', 'expr(num(0 : 1) : 1)'],
                   ['10', 'expr(num(10 : 1) : 1)'],
                   ['for a to 10 do a ( 10 ) end', 
                    ['expr(times-loop(k-for(for : 1) var-name(a : 2) '
                     + 'k-to(to : 3) expr(num(10 : 4) : 4) k-do(do : 5) '
                     + 'expr+(expr(action-call(expr(var-name(a : 6) : 6) k-((( : 7) '
                     + 'args-list(expr(num(10 : 8) : 8) : 8) k-)() : 9) '
                     + ': 9) : 9) : 9) k-end(end : 10) : 10) : 10)']]
                 ]);

  test_with_data(function (x) {
                   return toAST(logo_grammar.do_parse(lex_input(x))[0]);
                 },
                 [
                   ['10', 'expr(num(10))'],
                   ['a ( )', 
                    'expr(action-call(expr(var-name(a))))'],
                   ['a ( 10 11 )', 'expr(action-call(expr(var-name(a)),'
                     + 'args-list(expr(num(10)),expr(num(11)))))'],
                   ['for i to 10 do 1 a ( 10 ) 2 end', 'expr(times-loop(var-name(i),expr(num(10)),expr+(expr(num(1)),expr(action-call(expr(var-name(a)),args-list(expr(num(10))))),expr(num(2)))))']
                 ]);
}

function utils_tests() {
  test_with_data(function (x) {
                   return mappend(x, id);
                 },
                 [
                   [ [[1, 2, 3], [4, 5]], [1, 2, 3, 4, 5] ],
                   [ [[1, 2, 3], [], [4, 5]], [1, 2, 3, 4, 5] ]
                 ]);
  
  tests([
          [function () {
             var O = function () {
             };
             O.accessors('x');
             var o = new O();
             var o2 = new O();
             o.set_x(90);
             return o2.set_x(5) + o.get_x();
           }, 95],
          [function () {
             var O = function () {
             };
             O.accessors('z');
             return !(Function.get_z instanceof Function);
           }, true]
        ]);
}

function env_tests () {
  tests([
          [function () {
             var e = new Env();
             var e1 = new Env(e);
             e1.set('a', 11);
             return e.lookup('a');
           }, '11'],
          [function () {
             var e = new Env();
             var e1 = new Env(e);
             e1.set_local('a', 10);
             try {
               return e.lookup('a');
             } catch (e) {
               if (e instanceof LogoError) {
                 return 'not found';
               } 
               throw e;
             }
           }, 'not found'],
          [function () {
             var e = new Env();
             e.set_local('a', 10);
             var e1 = new Env(e);
             var e2 = new Env(e1);
             return e2.lookup('a');
           }, '10']
        ]);
}

function test () {
  utils_tests();
  lexer_tests();
  parser_tests();
  test_logo_gram();
  env_tests();
}
