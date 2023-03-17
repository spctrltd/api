import mongoose from 'mongoose'
import {readJsonFile, hash} from '../helper.js'

const type = name => {
	switch (name) {
		case 'String':
			return String
		case 'Boolean':
			return Boolean
		case 'Date':
			return Date
		case 'Number':
			return Number
		case 'ObjectId':
			return mongoose.Schema.ObjectId
		case 'Mixed':
			return mongoose.Schema.Types.Mixed
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
		dataType = arrayType(data)
	} else if (typeof data === 'object') {
		dataType = setDataType(data)
	}
	return dataType === null ? data : dataType
}

const setDataType = structure => {
	if (typeof structure === 'object') {
		return Object.keys(structure).reduce((acc, key) => {
			const dataType = evalDataType(structure[key])
			return {
				...acc,
				[key]: dataType
			}
		}, {})
	}

	return evalDataType(structure)
}

export default (name, modelPath) => {
	const config = readJsonFile(modelPath)

	if (config.model) {
		const models = mongoose.modelNames()
		if (models.includes(name)) {
			return {model: mongoose.model(name)}
		}
		const modelStructure = setDataType(config.model)
		const {
			timestamps = true,
			versionKey = false,
			encryptPassword = false,
			passwordField = 'password',
			idField,
			toJSON,
			virtuals
		} = config.schema || {}

		const schema = new mongoose.Schema(modelStructure, {
			timestamps,
			versionKey,
			toJSON
		})

		if (virtuals) {
			Object.keys(virtuals).forEach(virtualKey => {
				const {options, ref, localField, foreignField} = virtualKey
				schema.virtual(localField, {
					// TEST !!!
					options,
					ref,
					localField,
					foreignField
				})
			})
		}

		if (encryptPassword) {
			schema.pre('save', function (next) {
				if (idField) {
					this[idField] = this._id
				}
				if (this.isModified(passwordField)) {
					this[passwordField] = hash(this[passwordField])
				}
				return next()
			})
		}

		return {model: mongoose.model(name, schema)}
	}

	return null
}
