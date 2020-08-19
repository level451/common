module.exports = {
    gitInfo
};
const util = require('util');
const exec = util.promisify(require('child_process').exec);


async function gitInfo(repository = '/') {
    repository = process.cwd() + repository;
    let rslt = {};
    let selectedBranch;
    updateCommand = 'git -C "' + repository + '" branch';
    const {stderr, stdout} = await exec(updateCommand);
    let lines = stdout.split('\n');
    for (let i = 0; i < lines.length - 1; ++i) {
        let lineInfo = lines[i].split(' ');
        let branch = lineInfo[1] || lineInfo[2];
        rslt[branch] = true;
        if (lineInfo[0] == '*') {
            selectedBranch = branch;
        }
    }


    async function getPackageJsonVersion(hash) {
        let {stderr, stdout} = await exec('git -C "' + repository + '" show ' + hash + ':package.json');
        return JSON.parse(stdout).version;
    }


    for (const branch in rslt) {
        let {stderr, stdout} = await exec('git -C "' + repository + '" log -1 ' + branch + ' --pretty="format:%h%n%an (%ae)%n%at%n%b%B"');
        let details = stdout.split('\n');
        rslt[branch] = {
            version: await getPackageJsonVersion(details[0]),
            author: details[1],
            timeStamp: new Date(details[2] * 1000),
            info: details.slice(3).join('\n'),
            hash: details[0]
        };
    }
    return {
        branch: selectedBranch,
        version: rslt[selectedBranch].version,
        author: rslt[selectedBranch].author,
        timeStamp: rslt[selectedBranch].timeStamp,
        info: rslt[selectedBranch].info,
        hash: rslt[selectedBranch].hash,
        repository: rslt
    };
    console.log(rslt, selectedBranch);
}
