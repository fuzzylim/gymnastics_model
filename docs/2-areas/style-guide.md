# Style Guide

## Language Standards

This project uses **Australian English** for all documentation, code comments, and user-facing text.

## Australian English Conventions

### Spelling

Use Australian spelling consistently:

| ❌ American | ✅ Australian |
|------------|--------------|
| organize | organise |
| recognize | recognise |
| analyze | analyse |
| optimize | optimise |
| authorization | authorisation |
| synchronize | synchronise |
| categorize | categorise |
| personalize | personalise |
| customize | customise |
| initialize | initialise |
| serialize | serialise |
| normalize | normalise |
| minimize | minimise |
| maximize | maximise |
| prioritize | prioritise |
| standardize | standardise |
| center | centre |
| color | colour |
| behavior | behaviour |
| favor | favour |
| honor | honour |
| labor | labour |
| neighbor | neighbour |
| defense | defence |
| license (noun) | licence |
| practice (noun) | practice |
| practise (verb) | practise |
| program | program (not programme for IT) |
| dialog | dialogue |
| catalog | catalogue |
| analog | analogue |
| traveling | travelling |
| modeling | modelling |
| canceled | cancelled |
| labeled | labelled |

### Date Formats

- Use DD/MM/YYYY format: 29/01/2024
- Or spell out: 29 January 2024
- Never use MM/DD/YYYY format

### Time Formats

- Use 24-hour time: 14:30 (not 2:30 PM)
- Or use 12-hour with am/pm (lowercase): 2:30pm
- Time zones: AEDT, AEST, AWST, etc.

### Numbers

- Use spaces for thousands: 10 000 (not 10,000)
- Use decimal points: 3.14 (not 3,14)
- Spell out numbers one to nine in text

### Measurements

- Use metric system as primary
- Include imperial in parentheses if needed
- Examples: 10km, 25°C, 100kg

## Code Standards

### Variable Naming

Even in code, use Australian spelling for:
- Variable names
- Function names
- Class names
- Comments
- Documentation strings

```typescript
// ✅ Good
const authorisationToken = getToken();
const colourScheme = 'dark';
const organisationId = req.params.orgId;

// ❌ Avoid
const authorizationToken = getToken();
const colorScheme = 'dark';
const organizationId = req.params.orgId;
```

### API Endpoints

Use Australian spelling in API paths:

```typescript
// ✅ Good
app.post('/api/organisations/:id')
app.get('/api/authorisation/verify')
app.put('/api/users/:id/personalise')

// ❌ Avoid
app.post('/api/organizations/:id')
app.get('/api/authorization/verify')
app.put('/api/users/:id/personalize')
```

### Database Schema

Maintain Australian spelling in database fields:

```sql
CREATE TABLE organisations (
  organisation_id UUID PRIMARY KEY,
  organisation_name VARCHAR(255),
  licence_type VARCHAR(50),
  colour_theme VARCHAR(20)
);
```

### Error Messages

Use Australian English in all user-facing messages:

```typescript
// ✅ Good
throw new Error('Unauthorised access to organisation');
return { error: 'Failed to synchronise data' };

// ❌ Avoid
throw new Error('Unauthorized access to organization');
return { error: 'Failed to synchronize data' };
```

## Documentation Standards

### Technical Writing

- Use active voice where possible
- Keep sentences concise
- Define acronyms on first use
- Use Oxford commas for clarity

### Headings

- Use sentence case (not Title Case)
- Be descriptive and specific
- Keep under 60 characters

### Lists

- Use bullet points for unordered lists
- Use numbers for sequential steps
- Keep list items parallel in structure

## Common Technical Terms

Preferred Australian terminology:

| Term | Australian Usage |
|------|-----------------|
| Mobile phone | Mobile (not cell phone) |
| Car park | Car park (not parking lot) |
| Lift | Lift (not elevator) |
| Post code | Post code (not ZIP code) |
| State/Territory | Use Australian states/territories |
| GST | GST (not sales tax) |

## Git Commit Messages

Use Australian English in commit messages:

```bash
# ✅ Good
git commit -m "fix: Resolve authorisation error in multi-tenant organisations"
git commit -m "feat: Add colour customisation for tenant themes"

# ❌ Avoid
git commit -m "fix: Resolve authorization error in multi-tenant organizations"
git commit -m "feat: Add color customization for tenant themes"
```

## Review Checklist

Before submitting code or documentation:

- [ ] All spelling follows Australian conventions
- [ ] Dates use DD/MM/YYYY format
- [ ] API endpoints use Australian spelling
- [ ] Error messages use Australian English
- [ ] Comments and documentation are consistent
- [ ] Variable names follow conventions
- [ ] No American spellings remain

## Tools and Automation

### Spell Checking

Configure your editor to use Australian English:

**VS Code settings.json:**
```json
{
  "cSpell.language": "en-AU",
  "cSpell.words": [
    "organisation",
    "authorisation",
    "colour",
    "centre",
    "licence"
  ]
}
```

### ESLint Configuration

Add custom rules to enforce naming:

```javascript
module.exports = {
  rules: {
    'id-match': ['error', '^(?!.*(?:authorize|organize|color|center)).*$']
  }
};
```

## Exceptions

Some technical terms remain unchanged:

- HTTP status codes (401 Unauthorized)
- External API integrations (if they use American spelling)
- Third-party library names
- Programming language keywords

Document any exceptions clearly in code comments.