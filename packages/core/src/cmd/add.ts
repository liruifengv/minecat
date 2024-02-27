import prompts from "prompts";
import debug from "debug";
import { homedir } from "os";
import fs, { readdirSync } from "fs";
import shell from "shelljs";
const log = debug("minecat");

// 获取某个目录下面的所有文件夹
const getDirectories = (source) =>
  readdirSync(source, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name);

let proj_type;
let proj_package_json;
let proj_script_names;
let pkg_list = {};
let pkg_names = [];

export async function add(cmd) {
  if (cmd.input["_"].length === 0) {
    return cmd.help();
  }

  const moduleName =
    cmd.input["_"].length !== 0 ? cmd.input["_"][0] : "yourproject";

  try {
    const json = JSON.parse(
      fs.readFileSync(process.cwd() + "/package.json").toString()
    );
    if (!json.minecat) {
      console.log("please check this is a minecat project");
      return;
    } else {
      proj_package_json = json;
      proj_type = json.minecat.type;
      proj_script_names = Object.keys(json.scripts);
      // console.dir(proj_script_names);
      log("this is a minecat project with type = " + json.minecat.type);

      const originPkgDir = process.cwd() + "/packages";

      const pkgs = getDirectories(originPkgDir);

      log(pkgs);

      // mv pkg to ~/.minecat/Node.js/xxx
      for (const i in pkgs) {
        const json = JSON.parse(
          fs
            .readFileSync(
              process.cwd() + "/packages/" + pkgs[i] + "/package.json"
            )
            .toString()
        );

        pkg_list[json.name] = json;
      }
      pkg_names = Object.keys(pkg_list);
    }
  } catch (e) {
    console.error(e);
  }

  const pkgHome = homedir + `/.minecat/` + proj_type + "/";
  const pkgs = getDirectories(pkgHome);

  const appChoices = Object.keys(pkgs).map((x) => {
    return { title: pkgs[x], value: pkgs[x] };
  });

  const questions: any = [
    {
      type: "text",
      name: "newname",
      initial: moduleName,
      message: "What is the name of your new module?",
    },
    {
      type: "select",
      name: "tpl",
      message: "What is your module template?",
      choices: appChoices,
    },
    {
      type: "confirm",
      name: "confirm",
      initial: true,
      message: (prev, values) =>
        `Please confirm that you add ${prev} module to project in current directory?`,
    },
  ];

  const response = await prompts(questions);

  // console.dir(response);

  if (!proj_type) {
    console.dir("当前不是minecat项目，或者没有在项目根目录");
    return;
  }

  // 先判断newname是否存在
  log(
    "cp from " +
      pkgHome +
      response.tpl +
      " to " +
      process.cwd() +
      "/packages/" +
      response["newname"]
  );
  // 如果newname不存在，就拷贝tpl到newname
  shell.cp(
    "-Rf",
    pkgHome + "/" + response.tpl,
    process.cwd() + "/packages/" + response["newname"]
  );

  // rename package name
  try {
    const configFile =
      process.cwd() + "/packages/" + response["newname"] + "/package.json";
    const json = JSON.parse(fs.readFileSync(configFile).toString());
    json.name = response["newname"];
    fs.writeFileSync(configFile, JSON.stringify(json, null, 4));
  } catch (error) {
    throw error;
  }

  console.dir("done");
}
