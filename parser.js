/*
 * Lexer
 */

/*
 * parse a single token
 */
function parse_tok(x) {
  var n = parseFloat(x) || parseInt(x, 10);
  if (n || n===0) {
    return n;
  } else {
    return x;
  }
}

/*
 * reduce an input into a list of parsed tokens
 */
function lex_input(txt) {
  var tokens = txt.split(/[\s\n\r]+/).grep(function (x) {
                                             return x != '';
                                           });
  return tokens.map(parse_tok);
}

/*
 * Parser
 */

function Parse (name, kids, rem) {
  this.name = name;
  this.kids = kids;
  this.rem = rem;
}

Parse.prototype = {

  kidsString: function () {
    if (this.kids instanceof Array) {
      return this.kids.join(' ');
    } else {
      return this.kids;
    }
  },
  
  toString: function () {
    return this.name + '(' + this.kidsString() + ' : ' + this.rem + ')';
  }

};

function Rule() {
  this.lhs = 'none';
  this.rhs = [];
}

Rule.prototype = {

  atomic: function () {
    return !(this.rhs instanceof Array);
  },
    
  toString: function () {
    return this.lhs + ' ::= ' + (this.rhs instanceof Array ? 
                                 this.rhs.join(' ') : this.rhs);
  }

};

function Atom() {
  this.repr = 'fn';
}

Atom.prototype = {

  match: function (x) {
    return x == this.repr;
  },
    
  toString: function () {
    return this.repr;
  }
};


function Grammar() {
  this.rules =  [];
  this.start_rule =  ''; // top-level rule
  this.parse_cache = []; // maps index -> parse(what, index)
}

Grammar.prototype = {
 
  /*
   * Build a grammar from a list representation:
   * [
   *  [lhs, [kid1, ..., kidn]], // rule 1
   *  ...
   * ]
   * if kid1 == 'atom' then it is considered a terminal rule
   * and the second element is the atom or a matching function
   * non atomic rules may only have rule names as kids
   */
  init: function (lst) {
    this.rules = 
      jQuery.map(lst, 
                 function (rule) {
                   var r = new Rule();
                   r.lhs = rule[0];
                   if (rule[1][0]=='atom') {
                     var atm = new Atom();
                     if (rule[1][1] instanceof Function) {
                       atm.match = rule[1][1];
                     } else {
                       atm.repr = rule[1][1];
                     }
                     r.rhs = atm;
                   } else {
                     r.rhs = rule[1];                        
                   }
                   return r;
                 });
    this.start_rule = lst[0][0];
    
    return this;
  },
  
  /*
   * Find all rules whose first element in the rhs is the given rule name
   */
  start_with_rule: function(name) {
    return this.rules.grep(function (r) {
                             return r.rhs[0] == name;
                           });
  },
  
  /*
   * Find all terminal rules matching the given word
   */
  all_terminals: function(word) {
    return this.rules.grep(function (r) {
                             return r.atomic() && r.rhs.match(word);
                           });
  },
  
  /*
   * Bottom up parsing
   * Top-level function
   * what is a list of tokens
   */
  do_parse: function (what) {
    var self = this;
    this.parse_cache = []; // clean the cache
    
    return this.parse(what, 0).grep(function (parse) {
                                      return parse.rem == what.length && 
                                        parse.name == self.start_rule;
                                    });
  },

  /*
   * Actual parsing
   */
  parse: function(what, i) {
    var self = this;

    if (this.parse_cache[i]) {
      return this.parse_cache[i];
    }
    
    if (i>=what.length) {
      return [];
    }
    var rules = this.all_terminals(what[i]);
    var res = mappend(rules, function (rule) {
                        var res = self.extend(rule.lhs, [what[i]], what, 
                                              i+1, []);
                        return res;
                      });
    this.parse_cache[i] = res;
    return res;
  },
  
  /*
   * Extend a parse
   */
  extend: function(lhs, kids, what, i, needed) {
    var self = this;
    if (needed.length===0) {
      // extend upwards
      var parse = new Parse(lhs, kids, i);
      var ret = mappend(this.start_with_rule(lhs), function (upper) {
                          var rest = upper.rhs.slice(1, upper.rhs.length);
                          return self.extend(upper.lhs, [parse], 
                                             what, i, rest);
                         });
      ret.push(parse);
      return ret;
    } else {
      // extend rightwards
      var need = needed[0];
      var next = needed.slice(1, needed.length);
      var res = this.parse(what, i).grep(function (parse) {
                                           return parse.name == need;
                                         });
      // keep extending
      return mappend(res, function (parse) {
                       return self.extend(lhs, [].concat(kids, [parse]), 
                                          what, parse.rem, next);
                     });
    }
  }
};

