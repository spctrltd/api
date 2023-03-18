import fs from 'fs'
import path from 'path'
import mongodbModel from './model.mongodb.js'
import sqliteModel from './model.sqlite.js'
import {directoryExists, getAbsolutePath, constants} from '../helper.js'

const {DATABASE_TYPE_SQLITE, DATABASE_TYPE_MONGODB} = constants

const createFileList = (dataModelsPath, list = {}) => {
	const fileList = {...list}
	fs.readdirSync(dataModelsPath).forEach(file => {
		if (path.extname(file).toLowerCase() === '.json') {
			const name = path.basename(file, '.json')
			if (!Object.prototype.hasOwnProperty.call(fileList, name)) {
				fileList[name] = `${dataModelsPath}/${file}`
			}
		}
	})
	return fileList
}

/**
 * Load config file and build database models.
 * @param {symbol} databaseType - The database type.
 * @param {Sequelize|undefined} sequelize - If for SQL database, requires Sequelize.
 * @returns {object}
 */
export default async (databaseType, sequelize) => {
	const dataModels = {}
	const modelFields = {}
	const dataModelsPath = getAbsolutePath('./database/account')
	let fileList = createFileList(dataModelsPath)
	const userDataModelsPath = `${path.resolve('.')}/data-models`
	const doesExist = await directoryExists(userDataModelsPath)
	if (doesExist) {
		fileList = createFileList(userDataModelsPath, fileList)
	}

	const modelGenerator = {
		[DATABASE_TYPE_MONGODB]: mongodbModel,
		[DATABASE_TYPE_SQLITE]: sqliteModel
	}

	Object.keys(fileList).forEach(async name => {
		const {model, fields} = await modelGenerator[databaseType](name, fileList[name], sequelize)
		dataModels[name] = model
		modelFields[name] = fields
	})
	return {models: dataModels, fields: modelFields}
}
