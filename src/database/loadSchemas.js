import fs from 'fs'
import path from 'path'
import mongodbModel from './model.mongodb.js'
import sqliteModel from './model.sqlite.js'
import {directoryExists, getAbsolutePath} from '../helper.js'

const createFileList = (dataModelsPath, list = {}) => {
	const fileList = {...list}
	fs.readdirSync(dataModelsPath).forEach(file => {
		if (path.extname(file).toLowerCase() === '.json') {
			const name = path.basename(file, '.json')
			if (!fileList.hasOwnProperty(name)) {
				fileList[name] = `${dataModelsPath}/${file}`
			}
		}
	})
	return fileList
}

export default async (databaseType, sequelize) => {
	let dataModels = {}
	let dataStructures = {}
	const dataModelsPath = getAbsolutePath('./database/account')
	let fileList = createFileList(dataModelsPath)
	const userDataModelsPath = `${path.resolve('.')}/data-models`
	const doesExist = await directoryExists(userDataModelsPath)
	if (doesExist) {
		fileList = createFileList(userDataModelsPath, fileList)
	}

	// merge structure with user structures
	const structure = {}
	const modelGenerator = {mongodb: mongodbModel, sqlite: sqliteModel}

	Object.keys(fileList).forEach(async name => {
		const {model} = await modelGenerator[databaseType](name, fileList[name], sequelize)
		dataModels[name] = model
		dataStructures[name] = structure[name]
	})
	return {models: dataModels, structures: dataStructures}
}
