const express = require("express");
const db = require("./db");

//Служебные переменные
let mysql_error = false;
const port = 27015;
const http_server = express();
// -----------Методы API--------
//------------------------------

// GET /getunitsubjects?unit=11-Л
const getunitsubjects = (req, res) => {
  if (!req.query.unit) {
    return res.status(400).send("Отсутствует обязательный GET параметр: unit");
  }
  if (mysql_error) {
    return res.status(400).send(mysql_error);
  }
  const zapros =
    "SELECT `dnevnik_units`.`name` as 'unit',`dnevnik_groups`.`id` as 'group_id',`dnevnik_groups`.`name` as 'group_name',`dnevnik_subjects`.`id` as 'subject_id',`dnevnik_subjects`.`name` as 'subject_name' FROM `dnevnik_groups` RIGHT JOIN `dnevnik_units` ON `dnevnik_groups`.`unit_id`=`dnevnik_units`.id RIGHT JOIN `dnevnik_subjects` ON `dnevnik_groups`.`subject_id`=`dnevnik_subjects`.`id` WHERE `dnevnik_units`.`name`=?";
  db.query(zapros, [req.query.unit], (err, results, fields) => {
    if (err) return res.send(err.sqlMessage);
    if (results.length === 0)
      return res
        .status(400)
        .send("Информация по выбранному классу не найдена.");
    res.header("Content-type", "application/json");
    res.send(results);
  });
};
http_server.get("/getunitsubjects", getunitsubjects);

// GET mediumsubjects?unit=11-Л

// get major groups of subjects
const mediumsubjects = (req, res) => {
  if (!req.query.unit) {
    return res.status(400).send("Отсутствует обязательный GET параметр: unit");
  }
  if (mysql_error) {
    return res.status(400).send(mysql_error);
  }
  const zapros =
    "SELECT `dnevnik_units`.`name` as 'unit',`dnevnik_groups`.`id` as 'group_id',`dnevnik_groups`.`name` as 'group_name',`dnevnik_subjects`.`id` as 'subject_id',`dnevnik_subjects`.`name` as 'subject_name' FROM `dnevnik_groups` RIGHT JOIN `dnevnik_units` ON `dnevnik_groups`.`unit_id`=`dnevnik_units`.id RIGHT JOIN `dnevnik_subjects` ON `dnevnik_groups`.`subject_id`=`dnevnik_subjects`.`id` WHERE `dnevnik_units`.`name`=?";
  db.query(zapros, [req.query.unit], (err, results, fields) => {
    if (err) return res.status(400).send(err.sqlMessage);
    if (results.length === 0)
      return res
        .status(400)
        .send("Информация по выбранному классу не найдена.");

    let tmp = [
      { avg_mark: 0, group_id: [], title: "Алгебра", id: [46, 117] },
      { avg_mark: 0, group_id: [], title: "Биология", id: [57] },
      { avg_mark: 0, group_id: [], title: "Английский язык", id: [144641] },
      { avg_mark: 0, group_id: [], title: "Физика", id: [56] },
      { avg_mark: 0, group_id: [], title: "География", id: [45] },
      { avg_mark: 0, group_id: [], title: "Геометрия", id: [47] },
      { avg_mark: 0, group_id: [], title: "История", id: [40] },
      { avg_mark: 0, group_id: [], title: "Информатика", id: [32] },
      { avg_mark: 0, group_id: [], title: "Химия", id: [58] },
      { avg_mark: 0, group_id: [], title: "Литература", id: [33] },
      { avg_mark: 0, group_id: [], title: "Обществознание", id: [44] },
      { avg_mark: 0, group_id: [], title: "Русский язык", id: [3177, 144632] },
      { avg_mark: 0, group_id: [], title: "Физическая культура", id: [20] },
      { avg_mark: 0, group_id: [], title: "ОБЖ", id: [59] },
    ];
    results.forEach((el) => {
      tmp.forEach((tmp_el, index) => {
        tmp_el.id.forEach((tmp_el_id) => {
          if (el.subject_id === tmp_el_id) {
            tmp[index].group_id.push(el.group_id);
          }
        });
      });
    });
    tmp.forEach((el, index) => {
      let zpr =
        "SELECT sum(mark * weight) / sum(weight) as 'test' FROM `dnevnik_marks` WHERE `group_id` IN (?,?)";
      db.query(
        zpr,
        [el.group_id[0], el.group_id[1] ? el.group_id[1] : ""],
        (err, results) => {
          tmp[index].avg_mark = results[0].test;
          if (index === tmp.length - 1) {
            res.header("Content-type", "application/json");
            res.send(tmp);
          }
        }
      );
      return tmp;
    });
    // res.send(tmp);
  });
};
http_server.get("/mediumsubjects", mediumsubjects);

http_server.get("/", (req, res) => {
  res.send("1502 Statistics backend.");
});

//Подключение к БД
db.connect((err) => {
  if (err) {
    mysql_error = "Ошибка: " + err.message;
    return console.error("Ошибка: " + err.message);
  } else {
    console.log("Подключение к серверу MySQL успешно установлено");
  }
});

//Запуск HTTP сервера
http_server.listen(port, () => {
  console.log(`Сервис запущен на http://localhost:${port}`);
});
