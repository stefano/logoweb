var canvas;

$(document).ready(function () {
                    init();
                    // set up events here
                    document.getElementById('ok_img').onclick = logo_eval;
                  });

function logo_eval() {
  do_eval(document.getElementById('in').value);
}

function do_eval(txt) {
  if (txt.length==0) {
    // nothing to do
    return;
  }
  var parsed = logo_grammar.do_parse(lex_input(txt))[0];
  if (parsed) {
    try {
//      alert(parsed);
      var res = toEvaluator(toAST(parsed)).call(this, global_env);
    } catch (e) {
      if (!(e instanceof LogoError)) {
        throw e;
      } else {
        alert(e);
      }
    }
  } else {
    alert('Couldn\'t parse');
  }
/*  out = '<ol>';
  for (a in document.getElementById('out').getContext('2d')) {
      out += '<li>' + a + '</li>';
  }
  document.body.innerHTML += out;
*/
}

function init() {
  canvas = new LogoCanvas(document.getElementById('out'));
  // init height & width
  canvas.canvas.width = canvas.canvas.offsetWidth - canvas.canvas.offsetLeft;
  canvas.canvas.height = canvas.canvas.offsetHeight - canvas.canvas.offsetTop;
  canvas.draw();
}

function Point(x, y) {
  this.x = x;
  this.y = y;
}

Point.accessors('x');
Point.accessors('y');

/*
 * A move of the turtle
 */
function Move (pt, type, color, direction) {
  this.pt = pt;
  // type of line used to move the turtle to this point
  this.type = type || 'none';
  this.color = color || 'black'; // color of the line
}

Move.accessors('pt');
Move.accessors('type');
Move.accessors('color');

function Moves() {
  this.lst = [];
}

Moves.prototype = {
  go: function (m) {
    this.lst.push(m);
    return this;
  },
  back: function () {
    this.lst.pop();
    return this;
  },
  each: function (fn) {
    this.lst.each(function (x) {
                    fn.call(this, x);
                  });
    
    return this;
  },
  at: function (i) {
    return this.lst[i];
  },
  len: function (i) {
    return this.lst.length;
  }
};

/*
 * The turtle
 * LogoCanvas is responsible of drawing it
 */
function Turtle () {
  this.visible = true;
  this.reset_direction();
}

Turtle.accessors('visible');
Turtle.accessors('direction');

/*
 * Rotate the turtle clockwise of the given degrees
 */
Turtle.prototype.rot = function (deg) {
  var r = (Math.PI * deg) / 180; // degrees to radians
  // substract from the total to get a clockwise rotation
  this.set_direction(this.get_direction() - r);  
};

/*
 * Make the turtle watch the default direction
 */
Turtle.prototype.reset_direction = function () {
  // direction is in radians
  this.set_direction(Math.PI/2);
};

/*
 * The canvas: it's a singleton
 */
function LogoCanvas (cv) {
  this.canvas = cv;
  this.setupCoord();
  this.moves = new Moves();
  // initially put the turtle in the centre of the screen
  this.moves.go(new Move(new Point(0, 0)));
  this.turtle = new Turtle();
}

LogoCanvas.prototype = {
  // initialize the coordinate system
  setupCoord: function () {
    var ctx = this.canvas.getContext('2d');
    // put the coord system origin in the centre
    ctx.translate(this.canvas.width/2, this.canvas.height/2);
    // 200x200 space
    ctx.scale(this.canvas.width/200, this.canvas.height/200);
  }
};

LogoCanvas.accessors('moves');
LogoCanvas.accessors('turtle');

/*
 * User coor system (uc) -> Canvas coord system (cc)
 * (0, 0) is the centre in the uc
 * in the cc it is the upper left corner
 * in the uc -100 <= x <= 100 and -100 <= y <= 100
 * the direction of the y axis is reversed
 */
LogoCanvas.prototype.x = function (val) {
  return val;
};

LogoCanvas.prototype.y = function (val) {
  return -val;
};

/*
 * Make a point to advance the turtle of the given length
 * return the point
 */
LogoCanvas.prototype.a = function (length) {
  var prev = this.pos();
  var angle = this.get_turtle().get_direction();
  var pt = new Point(prev.get_x() + length*Math.cos(angle),
                     prev.get_y() + length*Math.sin(angle));
  return pt;
};

LogoCanvas.prototype.line_types = {
  none: function (cxt, pt) {
    cxt.moveTo(this.x(pt.get_x()), this.y(pt.get_y()));
  },
  straight: function (cxt, pt) {
    //alert('lineTo: ' + this.x(pt.get_x()) + ' ' + this.y(pt.get_y()));
    cxt.lineTo(this.x(pt.get_x()), this.y(pt.get_y()));
  },
  bezier: function (cxt, pt) {
    cxt.bezierCurveTo(this.x(pt.get_x()), this.y(pt.get_y()));
  }
};

/*
 * Current position of the turtle
 */
LogoCanvas.prototype.pos = function () {
  var m = this.get_moves();
  return m.at(m.len()-1).get_pt(); // pt is valid
};

/*
 * Draw the turtle on the screen
 * the turtle is a triangle with width = height = 3
 */
LogoCanvas.prototype.drawTurtle = function () {
  if (this.get_turtle().get_visible()) {
    var ctx = this.canvas.getContext('2d');
    var pos = this.pos();
    ctx.save();
    // do a rotation with centre the current position
    ctx.translate(this.x(pos.get_x()), this.y(pos.get_y()));
    // change sign because rotation is clockwise
    ctx.rotate(-(this.get_turtle().get_direction()-Math.PI/2));
    ctx.beginPath();
    ctx.moveTo(this.x(-1.5), this.y(0));
    ctx.lineTo(this.x(1.5), this.y(0));
    ctx.lineTo(this.x(0), this.y(3));
    ctx.lineTo(this.x(-1.5), this.y(0));
    ctx.fill();
    ctx.closePath();
    ctx.restore();
  }
};

/*
 * Draw on the screen the move at index i
 * 1 <= i < moves.length
 */
LogoCanvas.prototype.drawMove = function (i) {
  var m = this.get_moves();
  
  assert(1 <= i && i < m.len());
  
  var prev = m.at(i-1);
  var to_draw = m.at(i);
  var cxt = this.canvas.getContext('2d');
  
  if (!(this.line_types[to_draw.get_type()])) {
    throw new LogoError('internal: unknow line type: ' + to_draw.get_type());
  }  
  
  var old_color = cxt.strokeStyle;
  // !! should validate given color
  cxt.strokeStyle = to_draw.get_color();
  cxt.beginPath();
  var pt = prev.get_pt();
  cxt.moveTo(this.x(pt.get_x()), this.y(pt.get_y()));
  this.line_types[to_draw.get_type()].call(this, cxt, to_draw.get_pt());
  cxt.stroke();
  cxt.closePath();
  cxt.strokeStyle = old_color;
  
  return this;
};

/*
 * Draw all the movements
 * Clear any previous drawing
 */
LogoCanvas.prototype.draw = function () {
  this.canvas.width = this.canvas.width; // clear
  this.setupCoord();
  
  var l = this.get_moves().len();
  for (var i = 1; i < l; i++) {
    this.drawMove(i);
  }
  this.drawTurtle();
  
  return this;
};

LogoCanvas.prototype.drawLast = function () {
  this.drawMove(this.get_moves().len()-1);
};

/*
 * Grammar:
 * !! not up to date with current implementation !!
 * expr ::= var-name | action-call | num | times-loop
 * num ::= <atomic number>
 * var-name ::= <id>
 * k-for ::= 'for'
 * k-to ::= 'to'
 * k-do ::= 'do'
 * k-end ::= 'end'
 * k-( ::= '('
 * k-) ::= ')'
 * expr+ ::= expr expr+ | expr
 * times-loop ::= k-for var-name k-to num k-do expr+ k-end
 * action-call ::= expr k-( args-list k-)
 * args-list ::= expr | expr args-list
 */

var keywords = ['for', 'to', 'do', 'end', '(', ')', 'define-command', 'local', ':=', 'k-;', '+', '-', '*', '/'];

var logo_grammar = new Grammar();

logo_grammar.init([
                    ['expr+', ['expr', 'k-;', 'expr+']],
                    ['expr+', ['expr', 'k-;']],
                    ['expr', ['var-name']],
                    ['expr', ['action-call']],
                    ['expr', ['num']],
                    ['expr', ['times-loop']],
                    ['expr', ['local-var']],
                    ['expr', ['action-definition']],
                    ['expr', ['set-var']],
                    ['expr', ['k-(', 'expr', 'k-)']],
                    ['expr', ['math']],
                    ['math', ['math1']],
                    ['math', ['math1', 'math-op1', 'math1']],
                    // math-op2 has higher precedence
                    ['math1', ['math', 'math-op2', 'math']],
                    ['times-loop', 
                     ['k-for', 'var-name', 'k-to', 
                      'expr', 'k-do', 'expr+', 'k-end']],
                    ['local-var', ['k-local', 'var-name', 'expr']],
                    ['action-call', ['expr', 'k-(', 'k-)']],
                    ['action-call', ['expr', 'k-(', 'args-list', 'k-)']],
                    ['args-list', ['expr']],
                    ['args-list', ['expr', 'args-list']],
                    ['action-definition', ['k-action-def', 'var-name', 
                                           'expr+', 'k-end']],
                    ['action-definition', ['k-action-def', 'var-name', 'k-(',
                                           'var-list', 'k-)', 'expr+', 
                                           'k-end']],
                    ['var-list', ['var-name', 'var-list']],
                    ['var-list', ['var-name']],
                    ['set-var', ['var-name', 'k-:=', 'expr']],
                    ['k-;', ['atom', ';']],
                    ['k-:=', ['atom', ':=']],
                    ['k-action-def', ['atom', 'define-command']],
                    ['k-local', ['atom', 'local']],
                    ['k-for', ['atom', 'for']],
                    ['k-to', ['atom', 'to']],
                    ['k-do', ['atom', 'do']],
                    ['k-end', ['atom', 'end']],
                    ['k-(', ['atom', '(']],
                    ['k-)', ['atom', ')']],
                    ['num', ['atom', match_num]],
                    ['var-name', ['atom', match_id]],
                    ['math-op1', ['atom', match_op1]],
                    ['math-op2', ['atom', match_op2]]
                  ]);

function match_id(word) {
  return typeof(word) == 'string' && keywords.indexOf(word)==-1;
}

function match_num(word) {
  return typeof(word) == 'number';
}

function match_op1(word) {
  return ['+', '-'].indexOf(word)!=-1;
}

function match_op2(word) {
  return ['*', '/'].indexOf(word)!=-1;
}

/*
 * AST 
 */

function LogoAST (op, args) {
  this.op = op;
  this.args = args;
}

LogoAST.prototype = {
  toString: function () {
    return this.op + '(' + this.args + ')';
  }
};

/*
 * Transform a parse tree into an AST
 */
function toAST(parse) {
  return map_tree(parse, function (parse, new_kids) {
                    if (!(parse instanceof Parse)) { // terminal
                      return parse;
                    }
                    
                    if (parse.name[0]=='k') { // it's a keyword
                      return null; // ignore it
                    }
                               
                    if (parse.name == 'args-list' || parse.name == 'expr+'
                        || parse.name == 'var-list') {
                      // form an array holding all the 'expr' within the
                      // 'args-list' (or 'expr+')
                      if (new_kids.length<=1) {
                        return new LogoAST(parse.name, new_kids);
                      } else {
                        var kids = [new_kids[0]].concat(new_kids[1].args);
                        return new LogoAST(parse.name, kids);
                      }
                    }
                    
                    if (parse.name == 'math1') {
                      parse.name = 'math';
                    }
                    
                    if (parse.name == 'math-op2') {
                      parse.name = 'math-op1';
                    }
                    
                    return new LogoAST(parse.name, new_kids);
                  }, function (parse) {
                    if (parse instanceof Parse) {
                      return parse.kids;
                    } else {
                      return [];
                    }
                  });
}

/*
 * Evaluation
 */

// Data types

function LogoObject() {}

function LogoNil() {}

var logoNil = new LogoNil();

function LogoList(car, cdr) {
  this.car = car;
  this.cdr = cdr;
}

LogoList.prototype = new LogoObject();

function LogoFn(arglist, body) {
  this.arglist = arglist; // an array of var names
  this.body = body; // body is a function that takes an Env
}

LogoFn.prototype = new LogoObject();

LogoFn.prototype.logocall = function (env, args) {
  if (args.length != this.arglist.length) {
    throw new LogoError('Wrong number of parameters to function: expected ' +
                        this.arglist.length + ' got ' + args.length);
  }
  var e = new Env(env);
  for (var i = 0; i<args.length; ++i) {
    e.set_local(this.arglist[i], args[i]);
  }
  return this.body.call(this, e);
};

function LogoError(msg) {
  this.msg = 'Error: ' + msg;
}

LogoError.prototype.toString = function (x) {
  return this.msg;
};
                    
function Env(parent) {
  if (parent === undefined) {
    this.parent = null;
  } else {
    this.parent = parent;
  }
  this.vars = {};
}

Env.prototype = {
  
  lookup: function (var_name) {
    var e = this;
    var val = e.vars[var_name];
    // search environment with the variable
    while (e && val === undefined) {
      e = e.parent;
      if (e) {
        val = e.vars[var_name];
      }
    }
    if (e) {
      return val;
    } else {
      throw new LogoError('variable not found: ' + var_name);
    }
  },
  
  // set an already existing var
  // if none is found, create it in the global env
  set: function (var_name, val) {
    var e = this;
    // search environment with the variable
    while (e.parent !== null && e.vars[var_name] === undefined) {
      e = e.parent;
    }
    e.vars[var_name] = val;
    
    return val;
  },
  
  // set a local variable
  set_local: function (var_name, val) {
    this.vars[var_name] = val;
    
    return val;
  }
};

function toEvaluator(ast) {
  var actions = {
    _default_: function (node, kids) {
      return node;
    },
    
    num: function (node, kids) {
      return function (env) { return kids[0]; };
    },
    
    expr: function (node, kids) {
      // variable names must be evaluated only within an expr
      if (kids[0].op == 'var-name') {
        var name = kids[0].args[0];
        return function (env) {
          return env.lookup(name);
        };
      } else {
        return kids[0];
      }
    },
    
    'math-op1': function (node, kids) {
      return kids[0];
    },
    
    'math': function (node, kids) {
      if (kids.length == 1) {
        return kids[0];
      }
      
      var op = kids[1];
      var x = kids[0];
      var y = kids[2];
      return function (env) {
        return env.lookup(op).logocall(x.call(this, env), y.call(this, env));
      };
    },
    
    'expr+': function (node, kids) {
      return function (env) {
        var res = null;
        for (var i = 0; i<kids.length; ++i) {
          res = kids[i].call(this, env);
        }
        return res;
      };
    },

    'set-var': function (node, kids) {
      var name = kids[0].args[0];
      var val = kids[1];
      return function (env) {
        return env.set(name, val.call(this, env));
      };
    },
    
    'local-var': function (node, kids) {
      var name = kids[0].args[0];
      var val = kids[1];
      return function (env) {
        return env.set_local(name, val.call(this, env));
      };
    },
    
    'args-list': function (node, kids) {
      return kids;
    },
    
    'action-call': function (node, kids) {
      var fn = kids[0];
      var args = kids[1] || [];
      return function (env) {
        var vals = [];
        for (var i = 0; i<args.length; ++i) {
          vals.push(args[i].call(this, env));
          //alert(vals[i]);
        }
        return fn.call(this, env).logocall(env, vals);
      };
    },
 
    'action-definition': function (node, kids) {
      var name = kids[0].args[0];
      // default case with no argument list
      var args = [];
      var body = kids[1];
      if (kids[1].op == 'var-list') {
        // case with an argument list
        args = kids[1].args.map(function (var_name) {
                                  return var_name.args[0];
                                });
        body = kids[2];
      }
      return function (env) {
        env.set(name, new LogoFn(args, body));
      };
    },
    
    'times-loop': function (node, kids) {
      assert(kids[0].op == 'var-name');
      
      var v = kids[0].args[0];
      var times = kids[1];
      var body = kids[2];      
      return function (env) {
        var e = new Env(env);
        var t = times.call(this, e);
        for (var i = 0; i<t; i++) {
          e.set_local(v, i);
          //alert('tl:' + e.vars['i']);
          body.call(this, e);
        }
        
        return logoNil;
      };
    }
  };
  
  return map_tree(ast, function (node, kids) {
                    if (actions[node.op]) {
                      return actions[node.op].call(this, node, kids);
                    } else {
                      return actions['_default_'].call(this, node, kids);
                    }
                  }, function (node) {
                    if (node.args instanceof Array) {
                      return node.args;
                    } else {
                      return []; 
                    }
                  });
}

/*
 * Bultins function and variables
 */

var global_env = new Env();

global_env.set('line-type', 'straight');
global_env.set('color', 'black');

global_env.set('a', new LogoFn(['arg'], function (env) {
                                 var arg = env.lookup('arg');
                                 var line = env.lookup('line-type');
                                 var color = env.lookup('color');
                                 var pos = canvas.pos();
                                 var dest = canvas.a(arg);
                                 canvas.get_moves().go(new Move(dest, 
                                                                line, color));
                                 canvas.draw();
                                 return arg;
                               }));

global_env.set('b', new LogoFn(['arg'], function (env) {
                                 var arg = env.lookup('arg');
                                 var line = env.lookup('line-type');
                                 var color = env.lookup('color');
                                 var pos = canvas.pos();
                                 var dest = canvas.a(-arg);
                                 canvas.get_moves().go(new Move(dest, 
                                                                line, color));
                                 canvas.draw();
                                 return arg;
                               }));

global_env.set('r', new LogoFn(['arg'], function (env) {
                                 var arg = env.lookup('arg');
                                 canvas.get_turtle().rot(arg);
                                 canvas.draw();
                                 return arg;
                               }));

global_env.set('l', new LogoFn(['arg'], function (env) {
                                 var arg = env.lookup('arg');
                                 canvas.get_turtle().rot(-arg);
                                 canvas.draw();
                                 return arg;
                               }));

global_env.set('centre', new LogoFn([], function (env) {
                                      canvas.get_turtle().reset_direction();
                                      canvas.get_moves().go(
                                        new Move(new Point(0, 0)));
                                      canvas.draw();
                                      return logoNil;
                                    }));

global_env.set('hide', new LogoFn([], function (env) {
                                  canvas.get_turtle().set_visible(false);
                                  canvas.draw();
                                  return logoNil;
                                }));

global_env.set('show', new LogoFn([], function (env) {
                                    canvas.get_turtle().set_visible(true);
                                    canvas.draw();
                                    return logoNil;
                                  }));

global_env.set('up', new LogoFn([], function (env) {
                                  env.set('line-type', 'none');
                                  return logoNil;
                                }));

global_env.set('down', new LogoFn([], function (env) {
                                    env.set('line-type', 'straight');
                                    return logoNil;
                                  }));

global_env.set('+', new LogoFn(['x', 'y'], function (env) {
                                 return env.lookup('x') + env.lookup('y');
                               }));

global_env.set('-', new LogoFn(['x', 'y'], function (env) {
                                 return env.lookup('x') - env.lookup('y');
                               }));

global_env.set('*', new LogoFn(['x', 'y'], function (env) {
                                 return env.lookup('x') * env.lookup('y');
                               }));