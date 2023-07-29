const bcrypt = require("bcryptjs");

function swap(items, leftIndex, rightIndex) {
  var temp = items[leftIndex];
  items[leftIndex] = items[rightIndex];
  items[rightIndex] = temp;
}

function partition(items, left, right) {
  var pivot_index = Math.floor((right + left) / 2), //middle element
    i = left, //left pointer
    j = right; //right pointer

  while (i <= j) {
    while (
      items[i].listOfUsers.length < items[pivot_index].listOfUsers.length
    ) {
      i++;
    }
    while (
      items[j].listOfUsers.length > items[pivot_index].listOfUsers.length
    ) {
      j--;
    }
    if (i <= j) {
      swap(items, i, j); //swap two elements
      i++;
      j--;
    }
  }
  return i;
}

function quickSort(items, left, right) {
  var index;
  if (items.length > 1) {
    index = partition(items, left, right); //index returned from partition
    if (left < index - 1) {
      //more elements on the left side of the pivot
      quickSort(items, left, index - 1);
    }
    if (index < right) {
      //more elements on the right side of the pivot
      quickSort(items, index, right);
    }
  }
  return items;
}
// first call to quick sort
module.exports = { quickSort };
const sauce = "$2a$08$0DsQgZKFvEDwKba.iw6EL.IJzXzRNhth.wAc5vfB5FpLe4KjUS19G";

bcrypt
  .compare("89337133-17c9-42e3-9fef-78416a25651a", process.env.SAUCE)
  .then((foo) => console.log(foo));
