import '../../../css/components/preloader.css';
import '../../../css/pages/index/style.css';

const doc = document;
const { log, error } = console;

const getById = (id) => doc.getElementById(id);
const getAll = (selector) => doc.querySelectorAll(selector);
const get = (selector) => doc.querySelector(selector);
const getByClassName = (selector) => doc.getElementsByClassName(selector);

var acc = getByClassName('accordion');
var i;

for (i = 0; i < acc.length; i++) {
  acc[i].addEventListener('click', function () {
    this.classList.toggle('active');
    this.parentElement.classList.toggle('active');

    var pannel = this.nextElementSibling;

    if (pannel.style.display === 'block') {
      pannel.style.display = 'none';
    } else {
      pannel.style.display = 'block';
    }
  });
}
