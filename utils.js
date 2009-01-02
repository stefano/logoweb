function id (x) {
  return x;
}

function contains (a, x) {
  var i;
  for (i in a) {
    if (a[i] == x) {
      return true;
    }
  }
  
  return false;
}

Array.prototype.each = function (fn) {
  for (var i = 0; i<this.length; ++i) {
    fn.call(this, this[i]);
  }
};

Array.prototype.map = function (fn) {
  var res = [];
  for (var i = 0; i<this.length; ++i) {
    res.push(fn.call(this, this[i]));
  }
 
  return res;
};

Array.prototype.grep = function (fn) {
  var res = [];
  for (var i = 0; i<this.length; ++i) {
    if (fn.call(this, this[i])) {
      res.push(this[i]);
    }
  }
  
  return res;  
};

function mappend(lst, fn) {
  return [].concat.apply(jQuery.map(lst, fn));
}

/*
 * Map a tree
 * if fn returns null, node is not included
 * kids should return a list of children of a given node
 * or null if it is a leaf node
 */
function map_tree (root, fn, kids) {
  var new_kids = kids.call(this, root).map(function (x) {
                                             return map_tree(x, fn, kids);
                                             }).grep(function (x) {
                                                       return x !== null;
                                                     });
  return fn.call(this, root, new_kids);
}

/*
 * Define accessors functions get_slot and set_slot(x)
 * Usage: YourPrototype.accessors('slot_name');
 */
Function.prototype.accessors = function (slot) {
  this.prototype['get_' + slot] = function () {
    return this[slot];
  };
  this.prototype['set_' + slot] = function (x) {
    return (this[slot] = x);
  };
};

function assert (x) {
  if (!x) {
    throw new Error('assertion failure!');
  }
}
