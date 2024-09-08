import ora from "ora";
import semver from "semver";
import fsPromise from "fs/promises";
import fs from "fs";
import axios from "axios";

const API_KEY = process.env.ROOSTER_API_KEY;
const CURRENT_VERSION_FILE = "./.version";
const EXTENSION_PATH =
	"/home/adam/.mozilla/firefox/7oiw4j70.dev-edition-default/extensions/MasterLingQ@theartofdrowning.com.xpi";

async function checkCurrentVersion() {
	try {
		await fsPromise.access(CURRENT_VERSION_FILE);
		const data = await fsPromise.readFile(CURRENT_VERSION_FILE, "utf8");
		return data;
	} catch (err) {
		return null;
	}
}

async function saveVersion(version) {
	await fsPromise.writeFile(CURRENT_VERSION_FILE, version, "utf8");
}

async function fetchLatestVersion() {
	const resp = await axios.get(
		"https://theartofdrowning.com/php/latest_version.php",
		{
			params: {
				extensionName: "Rooster Master LingQ FF",
			},
		},
	);

	// Add .0 so that it conforms to semver
	const latestVersion = resp.data.latest_version + ".0";

	if (latestVersion === "unknown") {
		throw new Error("Unknown version found. Aborting.");
	}

	return latestVersion;
}

async function downloadLatestVersion() {
	const writer = fs.createWriteStream(EXTENSION_PATH, { flags: "w" });

	const resp = await axios.get("https://masterlingq.pp.ua/download-update", {
		params: {
			name: "MasterLingQ",
			browser: "Firefox",
			key: API_KEY,
		},
		responseType: "stream",
	});

	return resp.data.pipe(writer);
}

const currentVersion = await checkCurrentVersion();
const latestVersion = await fetchLatestVersion();

if (!semver.valid(currentVersion) || semver.gt(latestVersion, currentVersion)) {
	console.log(`New version - ${currentVersion} -> ${latestVersion}`);

	const spinner = ora("Downloading...").start();

	await downloadLatestVersion();
	await saveVersion(latestVersion);

	spinner.succeed();
} else {
	console.log("Already latest");
}
