import { readFile, writeFile, rm } from "node:fs/promises";

async function read(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

async function write(path, content) {
  return writeFile(new URL(`../${path}`, import.meta.url), content, "utf8");
}

function replaceRequired(source, search, replacement, label) {
  if (!source.includes(search)) {
    throw new Error(`Day31 patch target not found: ${label}`);
  }
  return source.replace(search, replacement);
}

function replaceRegexRequired(source, pattern, replacement, label) {
  if (!pattern.test(source)) {
    throw new Error(`Day31 patch target not found: ${label}`);
  }
  return source.replace(pattern, replacement);
}

async function patchContactBookingForm() {
  const path = "src/components/contact-booking-form.tsx";
  let source = await read(path);

  source = replaceRequired(
    source,
    '  pickupAddress: z.string().trim().min(1, "Vui lòng nhập điểm đón cụ thể."),\n  dropoffAddress: z.string().trim().min(1, "Vui lòng nhập điểm trả cụ thể."),\n  pickupNote: z.string().trim().max(500, "Lưu ý điểm đón tối đa 500 ký tự.").optional(),',
    '  pickupAddress: z\n    .string()\n    .trim()\n    .min(1, "Vui lòng nhập điểm đón cụ thể.")\n    .max(240, "Điểm đón tối đa 240 ký tự."),\n  dropoffAddress: z\n    .string()\n    .trim()\n    .min(1, "Vui lòng nhập điểm trả cụ thể.")\n    .max(240, "Điểm trả tối đa 240 ký tự."),\n  pickupNote: z.string().trim().max(300, "Lưu ý điểm đón tối đa 300 ký tự.").optional(),',
    "contact booking schema",
  );

  source = replaceRequired(
    source,
    '<input {...register("pickupAddress")} aria-invalid={!!errors.pickupAddress} placeholder="Số nhà, tên đường, phường/xã..." className="form-control" />',
    '<input {...register("pickupAddress")} maxLength={240} aria-invalid={!!errors.pickupAddress} placeholder="Số nhà, tên đường, phường/xã..." className="form-control" />',
    "contact pickup maxLength",
  );
  source = replaceRequired(
    source,
    '<input {...register("dropoffAddress")} aria-invalid={!!errors.dropoffAddress} placeholder="Số nhà, tên đường, phường/xã..." className="form-control" />',
    '<input {...register("dropoffAddress")} maxLength={240} aria-invalid={!!errors.dropoffAddress} placeholder="Số nhà, tên đường, phường/xã..." className="form-control" />',
    "contact dropoff maxLength",
  );
  source = replaceRequired(
    source,
    '<textarea {...register("pickupNote")} aria-invalid={!!errors.pickupNote} placeholder="Cổng, sảnh, mốc nhận diện hoặc hướng dẫn đón..." className="form-control min-h-24 resize-y" />',
    '<textarea {...register("pickupNote")} maxLength={300} aria-invalid={!!errors.pickupNote} placeholder="Cổng, sảnh, mốc nhận diện hoặc hướng dẫn đón..." className="form-control min-h-24 resize-y" />',
    "contact pickup note maxLength",
  );

  await write(path, source);
}

async function patchQuickBooking() {
  const path = "src/components/route-booking-actions.tsx";
  let source = await read(path);

  source = replaceRequired(
    source,
    '      pickupAddress: z.string().trim().min(1, "Vui lòng nhập điểm đón cụ thể."),\n      dropoffAddress: z.string().trim().min(1, "Vui lòng nhập điểm trả cụ thể."),\n      pickupNote: z.string().trim().max(500, "Lưu ý điểm đón tối đa 500 ký tự.").optional(),',
    '      pickupAddress: z\n        .string()\n        .trim()\n        .min(1, "Vui lòng nhập điểm đón cụ thể.")\n        .max(240, "Điểm đón tối đa 240 ký tự."),\n      dropoffAddress: z\n        .string()\n        .trim()\n        .min(1, "Vui lòng nhập điểm trả cụ thể.")\n        .max(240, "Điểm trả tối đa 240 ký tự."),\n      pickupNote: z.string().trim().max(300, "Lưu ý điểm đón tối đa 300 ký tự.").optional(),',
    "quick booking schema",
  );

  source = replaceRequired(
    source,
    '<input {...register("pickupAddress")} aria-invalid={!!errors.pickupAddress} className="form-control" placeholder="Số nhà, tên đường, phường/xã..." />',
    '<input {...register("pickupAddress")} maxLength={240} aria-invalid={!!errors.pickupAddress} className="form-control" placeholder="Số nhà, tên đường, phường/xã..." />',
    "quick pickup maxLength",
  );
  source = replaceRequired(
    source,
    '<input {...register("dropoffAddress")} aria-invalid={!!errors.dropoffAddress} className="form-control" placeholder="Số nhà, tên đường, phường/xã..." />',
    '<input {...register("dropoffAddress")} maxLength={240} aria-invalid={!!errors.dropoffAddress} className="form-control" placeholder="Số nhà, tên đường, phường/xã..." />',
    "quick dropoff maxLength",
  );
  source = replaceRequired(
    source,
    '<textarea {...register("pickupNote")} aria-invalid={!!errors.pickupNote} className="form-control min-h-24 resize-y" placeholder="Cổng, sảnh, mốc nhận diện hoặc hướng dẫn đón..." />',
    '<textarea {...register("pickupNote")} maxLength={300} aria-invalid={!!errors.pickupNote} className="form-control min-h-24 resize-y" placeholder="Cổng, sảnh, mốc nhận diện hoặc hướng dẫn đón..." />',
    "quick pickup note maxLength",
  );

  await write(path, source);
}

async function patchRouteFinder() {
  const path = "src/components/route-finder-form.tsx";
  let source = await read(path);

  source = replaceRequired(
    source,
    '  const [pickupAddress, setPickupAddress] = useState("");\n  const [dropoffAddress, setDropoffAddress] = useState("");\n  const [pickupNote, setPickupNote] = useState("");\n  const [error, setError] = useState("");',
    '  const [pickupAddress, setPickupAddress] = useState("");\n  const [dropoffAddress, setDropoffAddress] = useState("");\n  const [pickupNote, setPickupNote] = useState("");\n  const [pickupAddressError, setPickupAddressError] = useState("");\n  const [dropoffAddressError, setDropoffAddressError] = useState("");\n  const [pickupNoteError, setPickupNoteError] = useState("");\n  const [error, setError] = useState("");',
    "journey quote field error state",
  );

  source = replaceRequired(
    source,
    '    event.preventDefault();\n    setError("");\n\n    if (!fullName.trim()) {',
    '    event.preventDefault();\n    setError("");\n    setPickupAddressError("");\n    setDropoffAddressError("");\n    setPickupNoteError("");\n\n    const normalizedPickupAddress = pickupAddress.trim();\n    const normalizedDropoffAddress = dropoffAddress.trim();\n    const normalizedPickupNote = pickupNote.trim();\n\n    if (!fullName.trim()) {',
    "journey quote validation prelude",
  );

  source = replaceRequired(
    source,
    '    if (!pickupAddress.trim() || !dropoffAddress.trim()) {\n      setError("Vui lòng nhập điểm đón và điểm trả cụ thể.");\n      return;\n    }',
    '    let hasAddressError = false;\n    if (!normalizedPickupAddress) {\n      setPickupAddressError("Vui lòng nhập điểm đón cụ thể.");\n      hasAddressError = true;\n    } else if (normalizedPickupAddress.length > 240) {\n      setPickupAddressError("Điểm đón tối đa 240 ký tự.");\n      hasAddressError = true;\n    }\n    if (!normalizedDropoffAddress) {\n      setDropoffAddressError("Vui lòng nhập điểm trả cụ thể.");\n      hasAddressError = true;\n    } else if (normalizedDropoffAddress.length > 240) {\n      setDropoffAddressError("Điểm trả tối đa 240 ký tự.");\n      hasAddressError = true;\n    }\n    if (normalizedPickupNote.length > 300) {\n      setPickupNoteError("Lưu ý điểm đón tối đa 300 ký tự.");\n      hasAddressError = true;\n    }\n    if (hasAddressError) return;',
    "journey quote exact address validation",
  );

  source = replaceRequired(
    source,
    '          pickupAddress: pickupAddress.trim(),\n          dropoffAddress: dropoffAddress.trim(),\n          pickupNote: pickupNote.trim(),',
    '          pickupAddress: normalizedPickupAddress,\n          dropoffAddress: normalizedDropoffAddress,\n          pickupNote: normalizedPickupNote,',
    "journey quote normalized payload",
  );

  source = replaceRequired(
    source,
    '                <input value={pickupAddress} onChange={(event) => setPickupAddress(event.target.value)} className="form-control" placeholder="Số nhà, tên đường, phường/xã..." aria-invalid={!!error && !pickupAddress.trim()} />\n              </label>',
    '                <input\n                  value={pickupAddress}\n                  onChange={(event) => {\n                    setPickupAddress(event.target.value);\n                    if (pickupAddressError) setPickupAddressError("");\n                  }}\n                  maxLength={240}\n                  className="form-control"\n                  placeholder="Số nhà, tên đường, phường/xã..."\n                  aria-invalid={!!pickupAddressError}\n                />\n                {pickupAddressError && <p className="m-0 text-sm text-destructive" role="alert">{pickupAddressError}</p>}\n              </label>',
    "journey quote pickup field",
  );

  source = replaceRequired(
    source,
    '                <input value={dropoffAddress} onChange={(event) => setDropoffAddress(event.target.value)} className="form-control" placeholder="Số nhà, tên đường, phường/xã..." aria-invalid={!!error && !dropoffAddress.trim()} />\n              </label>',
    '                <input\n                  value={dropoffAddress}\n                  onChange={(event) => {\n                    setDropoffAddress(event.target.value);\n                    if (dropoffAddressError) setDropoffAddressError("");\n                  }}\n                  maxLength={240}\n                  className="form-control"\n                  placeholder="Số nhà, tên đường, phường/xã..."\n                  aria-invalid={!!dropoffAddressError}\n                />\n                {dropoffAddressError && <p className="m-0 text-sm text-destructive" role="alert">{dropoffAddressError}</p>}\n              </label>',
    "journey quote dropoff field",
  );

  source = replaceRequired(
    source,
    '                <textarea value={pickupNote} onChange={(event) => setPickupNote(event.target.value)} className="form-control min-h-24 resize-y" placeholder="Cổng, sảnh, mốc nhận diện hoặc hướng dẫn đón..." />\n              </label>',
    '                <textarea\n                  value={pickupNote}\n                  onChange={(event) => {\n                    setPickupNote(event.target.value);\n                    if (pickupNoteError) setPickupNoteError("");\n                  }}\n                  maxLength={300}\n                  className="form-control min-h-24 resize-y"\n                  placeholder="Cổng, sảnh, mốc nhận diện hoặc hướng dẫn đón..."\n                  aria-invalid={!!pickupNoteError}\n                />\n                {pickupNoteError && <p className="m-0 text-sm text-destructive" role="alert">{pickupNoteError}</p>}\n              </label>',
    "journey quote pickup note field",
  );

  await write(path, source);
}

async function patchRegressionGuard() {
  const path = "scripts/gocar-booking-pickup-dropoff-source.test.mjs";
  let source = await read(path);

  source = replaceRequired(
    source,
    'const bookingContract = await readFile(\n  new URL("../wordpress/gocar-core/includes/class-gocar-booking-request.php", import.meta.url),\n  "utf8",\n);',
    'const bookingContract = await readFile(\n  new URL("../wordpress/gocar-core/includes/class-gocar-booking-request.php", import.meta.url),\n  "utf8",\n);\nconst contactBookingForm = await readFile(\n  new URL("../src/components/contact-booking-form.tsx", import.meta.url),\n  "utf8",\n);\nconst quickBookingActions = await readFile(\n  new URL("../src/components/route-booking-actions.tsx", import.meta.url),\n  "utf8",\n);\nconst routeFinderForm = await readFile(\n  new URL("../src/components/route-finder-form.tsx", import.meta.url),\n  "utf8",\n);',
    "regression guard frontend reads",
  );

  const frontendTests = `\n\ntest("Day 31 frontend entry points keep the 240/240/300 pickup contract", () => {\n  for (const [name, frontend] of [\n    ["contact booking", contactBookingForm],\n    ["quick booking", quickBookingActions],\n  ]) {\n    assert.match(frontend, /pickupAddress:[\\s\\S]{0,180}max\\(240,/i, \\`${'${name}'} must validate pickupAddress <= 240\\`);\n    assert.match(frontend, /dropoffAddress:[\\s\\S]{0,180}max\\(240,/i, \\`${'${name}'} must validate dropoffAddress <= 240\\`);\n    assert.match(frontend, /pickupNote:[\\s\\S]{0,160}max\\(300,/i, \\`${'${name}'} must validate pickupNote <= 300\\`);\n    assert.match(frontend, /maxLength=\\{240\\}/, \\`${'${name}'} must expose 240-char address limits in the UI\\`);\n    assert.match(frontend, /maxLength=\\{300\\}/, \\`${'${name}'} must expose the 300-char pickup note limit in the UI\\`);\n  }\n\n  assert.match(routeFinderForm, /normalizedPickupAddress\\.length > 240/);\n  assert.match(routeFinderForm, /normalizedDropoffAddress\\.length > 240/);\n  assert.match(routeFinderForm, /normalizedPickupNote\\.length > 300/);\n  assert.ok((routeFinderForm.match(/maxLength=\\{240\\}/g) || []).length >= 2);\n  assert.match(routeFinderForm, /maxLength=\\{300\\}/);\n});\n\ntest("Day 31 frontend entry points preserve structured pickup payload fields", () => {\n  for (const field of ["pickupAddress", "dropoffAddress", "pickupNote"]) {\n    assert.match(contactBookingForm, new RegExp(field), \\`contact booking must expose ${'${field}'}\\`);\n    assert.match(quickBookingActions, new RegExp(\\`${'${field}'}:\\s*data\\.${'${field}'}\\`), \\`quick booking must send ${'${field}'}\\`);\n    assert.match(routeFinderForm, new RegExp(\\`${'${field}'}:\\s*normalized\\`), \\`route finder must send normalized ${'${field}'}\\`);\n  }\n});`;

  if (!source.includes('test("Day 31 frontend entry points keep the 240/240/300 pickup contract"')) {
    source += frontendTests;
  }

  await write(path, source);
}

await patchContactBookingForm();
await patchQuickBooking();
await patchRouteFinder();
await patchRegressionGuard();

await rm(new URL("./day31-apply-booking-validation.mjs", import.meta.url));
await rm(new URL("../.github/workflows/day31-apply-booking-validation.yml", import.meta.url));

console.log("Day 31 booking frontend validation patch applied successfully.");
