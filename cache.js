const db = require("./db");
const DBqueryasync = require("./DBqueryasync");
require("log-timestamp")(function () {
  return "[" + new Date().toLocaleString() + "] %s";
});

async function getUnitMediumMarks(unit) {
  return new Promise((resolve, reject) => {
    const zapros =
      "SELECT `dnevnik_units`.`name` as 'unit',`dnevnik_groups`.`id` as 'group_id',`dnevnik_groups`.`name` as 'group_name',`dnevnik_subjects`.`id` as 'subject_id',`dnevnik_subjects`.`name` as 'subject_name' FROM `dnevnik_groups` RIGHT JOIN `dnevnik_units` ON `dnevnik_groups`.`unit_id`=`dnevnik_units`.`id` RIGHT JOIN `dnevnik_subjects` ON `dnevnik_groups`.`subject_id`=`dnevnik_subjects`.`id` WHERE `dnevnik_units`.`name`=?";
    db.query(zapros, [unit], (err, results, fields) => {
      if (err) return console.log(err.sqlMessage);
      if (results.length === 0)
        return reject("Информация по выбранному классу не найдена." + unit);

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
        {
          avg_mark: 0,
          group_id: [],
          title: "Русский язык",
          id: [3177, 144632],
        },
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
        DBqueryasync(zpr, [
          el.group_id[0],
          el.group_id[1] ? el.group_id[1] : "",
        ]).then((result) => {
          tmp[index].avg_mark = result[0].test;
          tmp[index].unit = unit;
          if (index === tmp.length - 1) {
            resolve(tmp);
          }
        });
      });
    });
  });
}

const insertclass = async (arr_subjects, korpus) => {
  return new Promise(async (resolve, reject) => {
    const promises = arr_subjects.map(async (subj) => {
      const a = await DBqueryasync(
        `INSERT INTO avg_cache_${korpus} (unit,title,avg_mark,subject_id,group_id) values (?,?,?,?,?)`,
        [
          subj.unit,
          subj.title,
          subj.avg_mark,
          subj.id.toString(),
          subj.group_id.toString(),
        ]
      ).catch((err) => console.log(err));
      return a;
    });
    const res = await Promise.all(promises);
    resolve(res);
  });
};

const cache_medium_marks = async (array_of_units, korpus) => {
  return new Promise(async (resolve, reject) => {
    const promises = array_of_units.map(async (unit) => {
      const mediums = await getUnitMediumMarks(unit);
      return mediums;
    });
    const all_classes_medium = await Promise.all(promises);
    //записываем в базу данных результат;
    //1. Удаляем бд
    DBqueryasync(`DROP TABLE IF EXISTS avg_cache_${korpus}`).then(() => {
      //2. Создание бд
      DBqueryasync(
        `CREATE TABLE avg_cache_${korpus} (unit text,title text,avg_mark float,subject_id text, group_id text,date  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP)`
      ).then(async () => {
        const proms = all_classes_medium.map(async (item) => {
          const u = await insertclass(item, korpus);
          return u;
        });
        const done = await Promise.all(proms);
        resolve(done);
      });
    });
  });
};

module.exports = { cache_medium_marks, getUnitMediumMarks };
