import {
  DEAL,
  LIMITS,
  profileInputSchema,
  ROLE,
  type OwnProfile,
  type ProfileInput,
} from '@create-for-christ/contracts';
import { router } from 'expo-router';
import { useForm, useWatch } from 'react-hook-form';
import { Text, View } from 'react-native';
import { colors, spacing, radii } from '../../ui/theme';
import { RoleOption } from '../../ui/RoleOption';
import { useSaveProfile } from '../../hooks/useSaveProfile';
import { queryError } from '../../query/client';
import { DEAL_LABEL, ROUTE } from '../../constants';
import {
  FORM_OPTIONS,
  formResolver,
  applyApiErrors,
  splitList,
} from '../../forms';
import {
  Action,
  Avatar,
  Check,
  FormField,
  Notice,
  Page,
  SignOutAction,
  ui,
} from '../../ui';

export function ProfileForm({
  initial,
  name,
}: {
  initial: OwnProfile | null;
  name: string;
}) {
  const details = initial?.details;
  const defaultValues = {
    role: (details?.role ?? ROLE.creator) as 'creator' | 'brand',
    displayName: details?.displayName ?? name,
    location: details?.location ?? '',
    bio: details?.role === ROLE.creator ? details.bio : '',
    instagram: details?.role === ROLE.creator ? details.instagramHandle : '',
    languages:
      details?.role === ROLE.creator ? details.languages.join(', ') : 'Deutsch',
    topics: details?.role === ROLE.creator ? details.topics.join(', ') : '',
    portfolio:
      details?.role === ROLE.creator ? details.portfolioUrls.join('\n') : '',
    deals: (details?.role === ROLE.creator
      ? details.dealPreferences
      : ['barter', 'paid']) as ('barter' | 'paid')[],
    brandName: details?.role === ROLE.brand ? details.brandName : '',
    description: details?.role === ROLE.brand ? details.description : '',
    website: details?.role === ROLE.brand ? details.website : '',
    industry: details?.role === ROLE.brand ? details.industry : '',
  };
  type FormValues = typeof defaultValues;
  function toInput({
    role,
    displayName,
    location,
    bio,
    instagram,
    languages,
    topics,
    portfolio,
    deals,
    brandName,
    description,
    website,
    industry,
  }: FormValues): ProfileInput {
    return role === ROLE.creator
      ? {
          role,
          displayName,
          bio,
          instagramHandle: instagram.trim().replace(/^@/, ''),
          location,
          languages: splitList(languages),
          topics: splitList(topics),
          dealPreferences: deals,
          portfolioUrls: splitList(portfolio, '\n'),
        }
      : {
          role,
          displayName,
          brandName,
          description,
          website,
          industry,
          location,
        };
  }
  const fieldName = (path: string) =>
    ({
      instagramHandle: 'instagram',
      portfolioUrls: 'portfolio',
      dealPreferences: 'deals',
    })[path] ?? path;
  const {
    control,
    handleSubmit,
    setValue,
    clearErrors,
    setError: setFieldError,
    formState: { errors: fields, isSubmitting: busy },
  } = useForm({
    defaultValues,
    ...FORM_OPTIONS,
    resolver: formResolver<FormValues>(
      (values) => profileInputSchema.safeParse(toInput(values)),
      fieldName
    ),
  });
  const role = useWatch({ control, name: 'role' });
  const displayName = useWatch({ control, name: 'displayName' });
  const brandName = useWatch({ control, name: 'brandName' });
  const deals = useWatch({ control, name: 'deals' });
  const mutation = useSaveProfile();
  const error = queryError(mutation.error);
  function toggleDeal(deal: 'barter' | 'paid') {
    setValue(
      'deals',
      deals.includes(deal)
        ? deals.filter((value) => value !== deal)
        : [...deals, deal],
      { shouldValidate: true, shouldDirty: true }
    );
  }
  async function submit(values: FormValues) {
    const result = profileInputSchema.parse(toInput(values));
    try {
      await mutation.mutateAsync(result);
      router.replace(ROUTE.home);
    } catch (cause) {
      applyApiErrors(cause, setFieldError, values, fieldName);
    }
  }
  return (
    <Page
      title={
        initial
          ? role === ROLE.creator
            ? 'Dein Creator-Profil'
            : 'Dein Brand-Profil'
          : 'Deine kreative Zukunft.'
      }
      navigationRole={initial ? role : undefined}
      branded={!initial}
      subtitle={
        initial
          ? 'Halte deine Angaben aktuell.'
          : 'Wähle deine Rolle und richte dein Profil ein. Die Rolle bleibt danach fest mit deinem Konto verbunden.'
      }
    >
      {!initial ? (
        <View style={ui.field}>
          {Object.values(ROLE).map((value) => (
            <RoleOption
              key={value}
              role={value}
              selected={role === value}
              disabled={busy}
              onPress={() => {
                clearErrors();
                setValue('role', value, { shouldDirty: true });
              }}
            />
          ))}
        </View>
      ) : (
        <Text style={ui.label}>
          {role === ROLE.creator ? 'Creator-Profil' : 'Brand-Profil'}
        </Text>
      )}
      <View style={{ alignItems: 'center' }}>
        <Avatar
          large
          name={role === ROLE.brand ? brandName || displayName : displayName}
        />
      </View>
      <FormField
        label={
          role === ROLE.brand ? 'Dein Name / Ansprechpartner' : 'Dein Name'
        }
        control={control}
        name="displayName"
        maxLength={LIMITS.shortText}
        editable={!busy}
      />
      {role === ROLE.creator ? (
        <>
          <FormField
            label="Instagram-Nutzername"
            control={control}
            name="instagram"
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="dein.name"
            editable={!busy}
          />
          <Text style={ui.body}>
            Dein Instagram-Kanal muss öffentlich sein. Hier veröffentlichst du
            deine Reels.
          </Text>
          <FormField
            label="Über dich"
            control={control}
            name="bio"
            multiline
            maxLength={LIMITS.creatorBio}
            editable={!busy}
          />
          <FormField
            label="Sprachen (mit Komma trennen)"
            control={control}
            name="languages"
            placeholder="Deutsch, Englisch"
            editable={!busy}
          />
          <FormField
            label="Themen (mit Komma trennen)"
            control={control}
            name="topics"
            placeholder="Beauty, Food, Fitness"
            editable={!busy}
          />
          <Text style={ui.label}>Welche Deals interessieren dich?</Text>
          <View
            style={[
              ui.field,
              fields.deals && {
                borderWidth: spacing.hairline,
                borderColor: colors.danger,
                borderRadius: radii.small,
                padding: spacing.sm,
              },
            ]}
          >
            {Object.values(DEAL).map((deal) => (
              <Check
                key={deal}
                disabled={busy}
                checked={deals.includes(deal)}
                onPress={() => toggleDeal(deal)}
                label={DEAL_LABEL[deal]}
              />
            ))}
          </View>
          {fields.deals && (
            <Text accessibilityRole="alert" style={ui.error}>
              {fields.deals.message}
            </Text>
          )}
          <FormField
            label="Reel-Portfolio (optional, ein Link pro Zeile)"
            control={control}
            name="portfolio"
            multiline
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="https://www.instagram.com/reel/…/"
            editable={!busy}
          />
        </>
      ) : (
        <>
          <FormField
            label="Name deiner Brand"
            control={control}
            name="brandName"
            maxLength={LIMITS.shortText}
            editable={!busy}
          />
          <FormField
            label="Über deine Brand"
            control={control}
            name="description"
            multiline
            maxLength={LIMITS.brandDescription}
            editable={!busy}
          />
          <FormField
            label="Branche"
            control={control}
            name="industry"
            maxLength={LIMITS.shortText}
            placeholder="z. B. Kosmetik"
            editable={!busy}
          />
          <FormField
            label="Website (optional)"
            control={control}
            name="website"
            keyboardType="url"
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="https://deine-brand.de"
            editable={!busy}
          />
        </>
      )}
      <FormField
        label="Standort (optional)"
        control={control}
        name="location"
        maxLength={LIMITS.optionalText}
        editable={!busy}
      />
      <Notice message={error} error />
      <Action busy={busy} onPress={() => void handleSubmit(submit)()}>
        {initial ? 'Änderungen speichern' : 'Profil erstellen'}
      </Action>
      {initial && (
        <Action
          secondary
          disabled={busy}
          onPress={() => router.replace(ROUTE.home)}
        >
          Abbrechen
        </Action>
      )}
      <SignOutAction disabled={busy} />
    </Page>
  );
}
