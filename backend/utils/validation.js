const pool = require('../db');

async function checkShiftOverlap(userAddressId, weekDay, startTime, endTime, excludeShiftId = null) {
  const query = `
    SELECT id FROM schedule
    WHERE user_address_id = $1
      AND week_day = $2
      AND id != COALESCE($5, 0)
      AND NOT (end_time <= $3 OR start_time >= $4)
  `;
  
  const result = await pool.query(query, [
    userAddressId,
    weekDay,
    startTime,
    endTime,
    excludeShiftId
  ]);
  
  console.log('Overlap check:', { userAddressId, weekDay, startTime, endTime, excludeShiftId, found: result.rows.length });
  
  return result.rows.length > 0;
}

module.exports = { checkShiftOverlap };