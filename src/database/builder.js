import Sqlite from './database.class.sqlite.js'
import Mongodb from './database.class.mongodb.js'
import {constants} from '../helper.js'

const {DATABASE_TYPE_SQLITE, DATABASE_TYPE_MONGODB} = constants

/**
 * Database Builder class
 *
 * @class
 * @classdesc Builds a specific database based on type value passed
 */
export default class {
	drivers = {
		[DATABASE_TYPE_SQLITE]: Sqlite,
		[DATABASE_TYPE_MONGODB]: Mongodb
	}

	constructor({type, ...options}) {
		this.options = options
		this.type = type
	}

	init = async () => {
		this.loadDrivers()
		const Driver = this.drivers[this.type]
		if (Driver) {
			const database = new Driver(this.options)
			return await database.connect()
		}
	}

	loadDrivers = () => {
		// TODO: find user defined drivers
	}
}
