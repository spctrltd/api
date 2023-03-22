import path from 'path'
import mongodbModel from './model.mongodb.js'
import sqliteModel from './model.sqlite.js'
import {directoryExists, getAbsolutePath, constants, createFileList} from '../helper.js'

const {DATABASE_TYPE_SQLITE, DATABASE_TYPE_MONGODB, FILE_NAME_AS_KEY} = constants

/**
 * Load config file and build database models.
 *
 * @async
 * @param {Symbol} databaseType - The database type.
 * @param {Sequelize|undefined} sequelize - If for SQL database, requires Sequelize.
 * @returns {Promise<Object>}
 */
export default async (databaseType, sequelize) => {
	const dataModels = {}
	const modelFields = {}
	const dataModelsPath = getAbsolutePath('./database/account')
	let fileList = createFileList(dataModelsPath, ['.json'], FILE_NAME_AS_KEY)
	const userDataModelsPath = `${path.resolve('.')}/data-models`
	const doesExist = await directoryExists(userDataModelsPath)
	if (doesExist) {
		fileList = createFileList(userDataModelsPath, ['.json'], FILE_NAME_AS_KEY, fileList)
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
