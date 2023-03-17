import {DataTypes, Model} from 'sequelize'
import {readJsonFile, hash} from '../helper.js'

const type = name => {
	switch (name) {
		case 'String':
			return {type: DataTypes.STRING}
		case 'Boolean':
			return {type: DataTypes.BOOLEAN}
		case 'Date':
			return {type: DataTypes.DATE}
		case 'Number':
			return {type: DataTypes.NUMBER}
		case 'ObjectId':
			return {type: DataTypes.INTEGER}
		case 'Mixed':
			return {type: DataTypes.BLOB}
		case 'Virtual':
			return {type: DataTypes.VIRTUAL}
		default:
			return null
	}
}

const arrayType = data => {
	if (Array.isArray(data)) {
		let dataType = null
		if (data.length === 1) {
			dataType = type(data[0])
			if (dataType !== null) {
				dataType = [dataType]
			} else if (typeof data[0] === 'string') {
				dataType = data
			}
		}
		return dataType === null ? data.map(setDataType) : dataType
	}
	return null
}

const evalDataType = data => {
	let dataType = data
	if (typeof data === 'string') {
		dataType = type(data)
	} else if (Array.isArray(data)) {
		/// CHECK THIS
		dataType = arrayType(data)
	} else if (typeof data === 'object') {
		dataType = setDataType(data)
	}
	return dataType === null ? data : dataType
}

const setDataType = (structure, options = {}) => {
	if (typeof structure === 'object') {
		const {encryptPassword = false, passwordField = 'password', idField, virtuals} = options

		return Object.keys(structure).reduce((acc, key) => {
			let dataType = evalDataType(structure[key])
			if (encryptPassword && key === passwordField) {
				dataType = {
					...dataType,
					set(value) {
						this.setDataValue(passwordField, hash(value))
					}
				}
			}
			if (idField && key === idField) {
				dataType = {
					...dataType,
					autoIncrement: true,
					primaryKey: true
				}
			}
			if (virtuals && Object.prototype.hasOwnProperty.call(virtuals, key)) {
				const {ref, foreignField} = virtuals[key]
				dataType = {
					...dataType,
					references: {
						model: ref,
						key: foreignField
					}
				}
			}
			return {
				...acc,
				[key]: dataType
			}
		}, {})
	}

	return evalDataType(structure)
}

export default async (name, modelPath, sequelize) => {
	const config = readJsonFile(modelPath)

	if (config.model) {
		const models = Object.keys(sequelize.models)
		if (models.includes(name)) {
			return {model: sequelize.models[name]}
		}
		const modelStructure = setDataType(config.model, config.schema)
		const {timestamps = true} = config.schema || {}

		const sqlModel = class extends Model {}

		sqlModel.init(modelStructure, {
			timestamps,
			sequelize,
			modelName: name,
			freezeTableName: true
		})

		return {model: sequelize.models[name]}
	}

	return null
}
