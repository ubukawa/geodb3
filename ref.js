const dumpAndModify = async (bbox, relation, downstream, moduleKey) => {
    return new Promise((resolve, reject) => {
      const startTime = new Date()
      const [database, schema, table] = relation.split('::')
      if (!pools[database]) {
        pools[database] = new Pool({
          host: host,
          user: dbUser,
          port: port,
          password: dbPassword,
          database: database
        })
      }
      pools[database].connect(async (err, client, release) => {
        if (err) throw err
        let sql = `
  SELECT column_name FROM information_schema.columns 
   WHERE table_name='${table}' AND table_schema='${schema}' ORDER BY ordinal_position`
        let cols = await client.query(sql)
        cols = cols.rows.map(r => r.column_name).filter(r => r !== 'geom')
        cols = cols.filter(v => !propertyBlacklist.includes(v))
        // ST_AsGeoJSON(ST_Intersection(ST_MakeValid(${table}.geom), envelope.geom))
        cols.push(`ST_AsGeoJSON(${schema}.${table}.geom)`)
        await client.query(`BEGIN`)
        sql = `
  DECLARE cur CURSOR FOR 
  WITH 
    envelope AS (SELECT ST_MakeEnvelope(${bbox.join(', ')}, 4326) AS geom)
  SELECT 
    ${cols.toString()}
  FROM ${schema}.${table}
  JOIN envelope ON ${schema}.${table}.geom && envelope.geom
  ` 
        cols = await client.query(sql)
        try {
          while (await fetch(client, database, table, downstream) !== 0) {}
        } catch (e) {
          reject(e)
        }
        await client.query(`COMMIT`)
        winston.info(`${iso()}: finished ${relation} of ${moduleKey}`)
        release()
        resolve()
      })
    })
  }
  
  const sleep = (wait) => {
    return new Promise((resolve, reject) => {
      setTimeout(() => { resolve() }, wait)
    })
  }