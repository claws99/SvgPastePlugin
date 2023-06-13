import {
	App,
	Editor,
	TFile,
	MarkdownView,
	Modal,
	Notice,
	Plugin,
	PluginSettingTab,
	Setting
} from 'obsidian';



// Remember to rename these classes and interfaces!

interface SvgPastePluginSettings {
	mySetting: string;
}

const DEFAULT_SETTINGS: SvgPastePluginSettings = {
	mySetting: 'default'
}

export default class SvgPastePlugin extends Plugin {
	settings: SvgPastePluginSettings;
	async onload() {
		console.log('loading SVGPaste plugin');

		// register event for paste event and call handlePaste
		this.registerEvent(this.app.workspace.on("editor-paste", this.handlePaste.bind(this)));
	}

	onunload() {
		console.log('unloading SVGPaste plugin');
	}

	async handlePaste(event: ClipboardEvent, editor: Editor, mdView: MarkdownView): Promise<void> {
		console.log("Pasted something");
		console.log(event);

		if (event.defaultPrevented || !event.clipboardData) return;
		//console.log(event.clipboardData.items);

		//get svg data
		let svgData = "";

		// ---- Approach 1: get svg data from event.clipboardData.items ----
		const items = Array.from(event.clipboardData.items);
		const svgItem = items.find(item => item.type.includes("image/svg"));
		//items.forEach(item => console.log('mime-type:' + item.type));
		if (svgItem) {
			//console.log(svgItem);
			console.log("found svg in: " + svgItem.type);
			event.preventDefault();


			//method1: save sampleSvg using string method
			svgItem.getAsString(
				(data) => {
					console.log('getAsString method:' + data.length); //<--- ⚠ output: 0
				});

			//method2: get svgData using blob method
			var blob = svgItem.getAsFile();
			console.log('blob method:' + blob) //<---  output: ⚠  `null`
			if (blob) {
				const reader = new FileReader();
				reader.onloadend = () => {
					svgData = reader.result as string;
					console.log('onloadend' + svgData);

				};
				reader.readAsText(blob);
			}
		}

		// ---- Approach 2: get svg data from window.navigator. ----

		//method3: get svgData using navigator.readText method <-- how to make sure its only svg?
		activeWindow.navigator.clipboard.readText().then(
			(clipText) => {
				svgData = clipText;
				console.log('navigator.clipboard:' + svgData);
			}
		);

		//method4: get svgData using navigator.read method
		try {
			const clipboardItems = await navigator.clipboard.read();

			for (const clipboardItem of clipboardItems) {
			  for (const type of clipboardItem.types) {
				console.log(type);
				if( !type.includes("image/svg") ) continue;
				const blob = await clipboardItem.getType(type);
				// we can now use blob here
				const reader = new FileReader();
				reader.onloadend = () => {
					const svgData = reader.result as string;
					console.log('navigator.read:', svgData);
				};

				reader.readAsText(blob);
			}
		} catch (error) {
			console.error("Failed to read clipboard data:", error);
		}

		//save svg file & insert the new svg file link in the editor
		const svgName = this.getRandomSvgName();
		//console.log(svgName);
		this.saveSvgFile(svgName, svgData);
		//insert svg file link
		const svgFileLink = `![[${svgName}]]`;
		editor.replaceSelection(svgFileLink);


	}


	async isPasteSvg() {
		try {
			// read clipboard items 
			// and iterate through items to find 'format' of each item 
			// & get data for svg format


		}
		catch (error) {
			console.error("Error reading clipboard data:", error);
		}
	}

	getRandomSvgName(): string {
		// random string of 11 characters containing a-zA-Z0-9
		let length = 11;
		let randomString = '';
		const characters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
		const charactersLength = characters.length;

		for (let i = 0; i < length; i++) {
			const randomIndex = Math.floor(Math.random() * charactersLength);
			randomString += characters.charAt(randomIndex);
		}

		return `svg_${randomString}.svg`;

	}

	isTextSvg(data: string | Blob, type: string): boolean {

		/* 
		<?xml version="1.0" encoding="UTF-8" standalone="no"?>
		<!-- Created with Inkscape (http://www.inkscape.org/) -->

		<svg
		version="1.1"
		id="svg29731"
		xml:space="preserve"
		*/
		//does beging with <?xml version="1.0" 
		if (data.startsWith("<?xml version=\"1.0\"") && data.includes("<svg")) {
			return true;
		}
		return false;
	}

	saveSvgFile(filename: string, data: string): void {

		//get current folder path
		const activeFile: TFile | null = this.app.workspace.getActiveFile();
		if (!activeFile) {
			// throw error
			new Notice("No active file");
			return;
		}
		const currentFolderPath: string | null = activeFile.parent.path;

		//convert string to arraybuffer
		const svgArrayBuffer = new TextEncoder().encode(data).buffer;
		//create file in the current folder
		this.app.vault.createBinary(`${currentFolderPath}/${filename}`, svgArrayBuffer);
	}
}


export class FileNameModal extends Modal {
	result: string;
	onSubmit: (result: string) => void;

	constructor(app: App, onSubmit: (result: string) => void) {
		super(app);
		this.onSubmit = onSubmit;
	}

	onOpen() {
		const { contentEl } = this;

		contentEl.createEl("h1", { text: "FileName" });

		new Setting(contentEl)
			.setName("Name")
			.addText((text) =>
				text.onChange((value) => {
					this.result = value
				}));

		new Setting(contentEl)
			.addButton((btn) =>
				btn
					.setButtonText("Submit")
					.setCta()
					.onClick(() => {
						this.close();
						this.onSubmit(this.result);
					}));
	}

	onClose() {
		let { contentEl } = this;
		contentEl.empty();
	}
}