import Sqlite from './database.class.sqlite.js'
import Mongodb from './database.class.mongodb.js'

export default class {
	drivers = {
		sqlite: Sqlite,
		mongodb: Mongodb
	}

	constructor({type = 'sqlite', ...options}) {
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
		// find user defined drivers
	}
}
