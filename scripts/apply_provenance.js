const fs = require('fs');

function applyBatchesActions() {
  const file = 'src/app/(app)/batches/[id]/actions.ts';
  let content = fs.readFileSync(file, 'utf8');

  // Add import
  if (!content.includes("import { headers } from 'next/headers'")) {
    content = content.replace(
      "import { sendFermentationAlertNotification } from '@/app/actions/push-actions'",
      "import { sendFermentationAlertNotification } from '@/app/actions/push-actions'\nimport { headers } from 'next/headers'"
    );
  }

  // updateBatchFG reading
  const fgReadingTarget = `    // Also create a reading so it shows on the dashboard chart
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('batch_readings').insert({
      batch_id: batchId,
      gravity: fg,
      logger_id: user?.id,
      notes: 'Manual gravity log'
    })`;
  const fgReadingReplacement = `    const reqHeaders = await headers()
    const ip = reqHeaders.get('x-forwarded-for') || reqHeaders.get('x-real-ip') || 'unknown'
    const userAgent = reqHeaders.get('user-agent') || 'unknown'

    // Also create a reading so it shows on the dashboard chart
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('batch_readings').insert({
      batch_id: batchId,
      gravity: fg,
      logger_id: user?.id,
      notes: 'Manual gravity log',
      provenance_ip: ip,
      provenance_user_agent: userAgent
    })`;
  content = content.replace(fgReadingTarget, fgReadingReplacement);

  // logManualReading
  const manualReadingTarget = `    const reading = {
      batch_id: batchId,
      brewery_id: brewery.id,
      temperature: parseOptional('temperature'),
      gravity: parseOptional('gravity'),
      ph: parseOptional('ph'),
      dissolved_oxygen: parseOptional('dissolved_oxygen'),
      pressure: parseOptional('pressure'),
      notes: (formData.get('notes') as string) || null,
      logger_id: user?.id ?? null,
    }

    const { error } = await supabase.from('batch_readings').insert(reading)`;
    
  const manualReadingReplacement = `    const reqHeaders = await headers()
    const ip = reqHeaders.get('x-forwarded-for') || reqHeaders.get('x-real-ip') || 'unknown'
    const userAgent = reqHeaders.get('user-agent') || 'unknown'

    const reading = {
      batch_id: batchId,
      brewery_id: brewery.id,
      temperature: parseOptional('temperature'),
      gravity: parseOptional('gravity'),
      ph: parseOptional('ph'),
      dissolved_oxygen: parseOptional('dissolved_oxygen'),
      pressure: parseOptional('pressure'),
      notes: (formData.get('notes') as string) || null,
      logger_id: user?.id ?? null,
      provenance_ip: ip,
      provenance_user_agent: userAgent,
    }

    const { error } = await supabase.from('batch_readings').insert(reading)`;

  content = content.replace(manualReadingTarget, manualReadingReplacement);
  fs.writeFileSync(file, content);
}

function applyIotRoute() {
  const file = 'src/app/api/iot/log/route.ts';
  let content = fs.readFileSync(file, 'utf8');

  const insertTarget = `    const payload = await req.json()
    const { tank_id, batch_id, temperature, gravity, ph, dissolved_oxygen, pressure, notes } = payload

    if (!tank_id && !batch_id) {`;
    
  const insertReplacement = `    const payload = await req.json()
    const { tank_id, batch_id, temperature, gravity, ph, dissolved_oxygen, pressure, notes } = payload

    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
    const userAgent = req.headers.get('user-agent') || 'iot-device'

    if (!tank_id && !batch_id) {`;
  content = content.replace(insertTarget, insertReplacement);

  const objTarget = `        dissolved_oxygen: dissolved_oxygen ?? null,
        pressure: pressure ?? null,
        notes: notes || 'Automated IoT Sensor Reading',
        logger_id: null // Automated
      })`;
  const objReplacement = `        dissolved_oxygen: dissolved_oxygen ?? null,
        pressure: pressure ?? null,
        notes: notes || 'Automated IoT Sensor Reading',
        logger_id: null, // Automated
        provenance_ip: ip,
        provenance_user_agent: userAgent
      })`;
  content = content.replace(objTarget, objReplacement);
  fs.writeFileSync(file, content);
}

function applyVoice() {
  const file = 'src/app/actions/voice.ts';
  let content = fs.readFileSync(file, 'utf8');
  
  if (!content.includes("import { headers } from 'next/headers'")) {
    content = content.replace(
      "import { revalidatePath } from 'next/cache'",
      "import { revalidatePath } from 'next/cache'\nimport { headers } from 'next/headers'"
    );
  }

  const insertTarget = `    // Insert Reading
    const { error: insertError } = await supabase.from('batch_readings').insert({
      batch_id: finalBatchId,
      logger_id: user.id,
      temperature: extractedData.temperature || null,
      gravity: extractedData.gravity || null,
      notes: extractedData.notes || 'No notes.'
    })`;
  const insertReplacement = `    const reqHeaders = await headers()
    const ip = reqHeaders.get('x-forwarded-for') || reqHeaders.get('x-real-ip') || 'unknown'
    const userAgent = reqHeaders.get('user-agent') || 'unknown'

    // Insert Reading
    const { error: insertError } = await supabase.from('batch_readings').insert({
      batch_id: finalBatchId,
      logger_id: user.id,
      temperature: extractedData.temperature || null,
      gravity: extractedData.gravity || null,
      notes: extractedData.notes || 'No notes.',
      provenance_ip: ip,
      provenance_user_agent: userAgent
    })`;
  content = content.replace(insertTarget, insertReplacement);
  fs.writeFileSync(file, content);
}

applyBatchesActions();
applyIotRoute();
applyVoice();
console.log('Done!');
