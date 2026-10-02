import { AppText as Text, AppTextInput as TextInput } from "@/components/app-text";
import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View, Image } from "react-native";
import { router } from "expo-router";
import { useDispatch, useSelector } from "react-redux";
import * as ImagePicker from "expo-image-picker";

import {
  updateProfile,
  removeProfileImage,
  updateProfileImage,
} from "@/api/users";
import { Screen } from "@/components/screen";
import { Colors, Fonts } from "@/constants/theme";
import { setCurrentUser } from "@/store/auth-slice";
import type { AppDispatch, RootState } from "@/store/store";

type NameVisibility = "public" | "friends" | "private";

const visibilityOptions: {
  value: NameVisibility;
  label: string;
  description: string;
}[] = [
  {
    value: "public",
    label: "PUBLIC",
    description: "VISIBLE TO ALL ASCENDRA USERS",
  },
  {
    value: "friends",
    label: "FRIENDS",
    description: "VISIBLE TO ACCEPTED FRIENDS",
  },
  {
    value: "private",
    label: "PRIVATE",
    description: "VISIBLE ONLY TO YOU",
  },
];

export default function EditProfileScreen() {
  const dispatch = useDispatch<AppDispatch>();

  const user = useSelector((state: RootState) => state.auth.user);

  const [firstName, setFirstName] = useState(user?.firstName ?? "");
  const [lastName, setLastName] = useState(user?.lastName ?? "");
  const [bio, setBio] = useState(user?.bio ?? "");
  const [nameVisibility, setNameVisibility] = useState<NameVisibility>(
    user?.nameVisibility ?? "private",
  );
  const [isUpdatingImage, setIsUpdatingImage] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function chooseProfileImage() {
    if (isUpdatingImage) {
      return;
    }

    try {
      setError(null);
      setIsUpdatingImage(true);

      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        setError("PHOTO_LIBRARY_PERMISSION_REQUIRED");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled) {
        return;
      }

      const image = result.assets[0];

      if (!image) {
        return;
      }

      const updatedUser = await updateProfileImage({
        uri: image.uri,
        fileName: image.fileName,
        mimeType: image.mimeType,
      });

      dispatch(setCurrentUser(updatedUser));
    } catch (imageError) {
      console.error("Failed to update profile image:", imageError);

      setError("UNABLE_TO_UPDATE_PROFILE_IMAGE");
    } finally {
      setIsUpdatingImage(false);
    }
  }

  async function deleteProfileImage() {
    if (isUpdatingImage) {
      return;
    }

    try {
      setIsUpdatingImage(true);
      setError(null);

      const updatedUser = await removeProfileImage();

      dispatch(setCurrentUser(updatedUser));
    } catch (imageError) {
      console.error("Failed to remove profile image:", imageError);

      setError("UNABLE_TO_REMOVE_PROFILE_IMAGE");
    } finally {
      setIsUpdatingImage(false);
    }
  }

  if (!user) {
    return (
      <Screen>
        <View style={styles.errorContainer}>
          <Text style={styles.systemError}>
            {"// SYSTEM_ERROR: PROFILE_NOT_FOUND"}
          </Text>
        </View>
      </Screen>
    );
  }

  const hasChanges =
    firstName.trim() !== user.firstName ||
    lastName.trim() !== user.lastName ||
    bio.trim() !== user.bio ||
    nameVisibility !== user.nameVisibility;

  async function saveProfile() {
    if (!hasChanges || isSaving) {
      return;
    }

    try {
      setIsSaving(true);
      setError(null);

      const updatedUser = await updateProfile({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        bio: bio.trim(),
        nameVisibility,
      });

      dispatch(setCurrentUser(updatedUser));

      router.back();
    } catch (saveError) {
      console.error("Failed to update profile:", saveError);

      setError("UNABLE_TO_UPDATE_PROFILE");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Screen scroll keyboardAvoiding>
      <View style={styles.page}>
        {/* HEADER */}

        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [
            styles.backButton,
            pressed ? styles.pressed : null,
          ]}
        >
          <Text style={styles.backText}>← BACK</Text>
        </Pressable>

        <View style={styles.header}>
          <Text style={styles.eyebrow}>ASCENDRA_ID // PROFILE_CONFIG</Text>

          <Text style={styles.title}>Edit Profile</Text>

          <Text style={styles.subtitle}>
            CONTROL HOW YOUR IDENTITY APPEARS ACROSS ASCENDRA.
          </Text>
        </View>

        {/* IDENTITY */}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionCode}>01</Text>

          <View style={styles.sectionHeading}>
            <Text style={styles.sectionEyebrow}>IDENTITY_DATA</Text>

            <Text style={styles.sectionTitle}>Identity</Text>
          </View>
        </View>

        <View style={styles.panel}>
          <View style={styles.field}>
            <View style={styles.fieldHeader}>
              <Text style={styles.label}>FIRST_NAME</Text>

              <Text style={styles.fieldLimit}>{firstName.length}/50</Text>
            </View>

            <TextInput
              value={firstName}
              onChangeText={setFirstName}
              placeholder="First name"
              placeholderTextColor={Colors.dark.textDim}
              maxLength={50}
              autoCapitalize="words"
              autoCorrect={false}
              returnKeyType="next"
              style={styles.input}
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.field}>
            <View style={styles.fieldHeader}>
              <Text style={styles.label}>LAST_NAME</Text>

              <Text style={styles.fieldLimit}>{lastName.length}/50</Text>
            </View>

            <TextInput
              value={lastName}
              onChangeText={setLastName}
              placeholder="Last name"
              placeholderTextColor={Colors.dark.textDim}
              maxLength={50}
              autoCapitalize="words"
              autoCorrect={false}
              returnKeyType="done"
              style={styles.input}
            />
          </View>
        </View>

        {/* PRIVACY */}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionCode}>02</Text>

          <View style={styles.sectionHeading}>
            <Text style={styles.sectionEyebrow}>VISIBILITY_CONTROL</Text>

            <Text style={styles.sectionTitle}>Name Visibility</Text>
          </View>
        </View>

        <View style={styles.visibilityPanel}>
          {visibilityOptions.map((option, index) => {
            const selected = nameVisibility === option.value;

            return (
              <View key={option.value}>
                {index > 0 ? <View style={styles.divider} /> : null}

                <Pressable
                  onPress={() => setNameVisibility(option.value)}
                  style={({ pressed }) => [
                    styles.visibilityRow,
                    pressed ? styles.pressed : null,
                  ]}
                >
                  <View
                    style={[
                      styles.radioOuter,
                      selected ? styles.radioOuterSelected : null,
                    ]}
                  >
                    {selected ? <View style={styles.radioInner} /> : null}
                  </View>

                  <View style={styles.visibilityText}>
                    <Text
                      style={[
                        styles.visibilityLabel,
                        selected ? styles.visibilityLabelSelected : null,
                      ]}
                    >
                      {option.label}
                    </Text>

                    <Text style={styles.visibilityDescription}>
                      {option.description}
                    </Text>
                  </View>

                  <Text
                    style={[
                      styles.visibilityStatus,
                      selected ? styles.visibilityStatusSelected : null,
                    ]}
                  >
                    {selected ? "[ACTIVE]" : "[ ]"}
                  </Text>
                </Pressable>
              </View>
            );
          })}
        </View>

        <Text style={styles.privacyNote}>
          {
            "// FRIEND_VISIBILITY WILL APPLY TO ACCEPTED CONNECTIONS ONCE THE FRIEND SYSTEM IS ACTIVE."
          }
        </Text>

        {/* BIO */}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionCode}>03</Text>

          <View style={styles.sectionHeading}>
            <Text style={styles.sectionEyebrow}>PUBLIC_PROFILE_DATA</Text>

            <Text style={styles.sectionTitle}>Bio</Text>
          </View>
        </View>

        <View style={styles.bioPanel}>
          <View style={styles.fieldHeader}>
            <Text style={styles.label}>BIO</Text>

            <Text style={styles.fieldLimit}>{bio.length}/250</Text>
          </View>

          <TextInput
            value={bio}
            onChangeText={setBio}
            placeholder="Tell the Ascendra community about yourself..."
            placeholderTextColor={Colors.dark.textDim}
            maxLength={250}
            multiline
            textAlignVertical="top"
            style={styles.bioInput}
          />

          <Text style={styles.publicLabel}>{"[PUBLIC]"}</Text>
        </View>

        {/* PROFILE IMAGE PLACEHOLDER */}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionCode}>04</Text>

          <View style={styles.sectionHeading}>
            <Text style={styles.sectionEyebrow}>PROFILE_VISUAL</Text>

            <Text style={styles.sectionTitle}>Profile Image</Text>
          </View>
        </View>

        <View style={styles.imagePanel}>
          <View style={styles.profileImageArea}>
            <View style={styles.profileImageFrame}>
              {user.profileImage.url ? (
                <Image
                  source={{ uri: user.profileImage.url }}
                  style={styles.profileImage}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.profileImageEmpty}>
                  <Text style={styles.profileImageEmptyText}>IMG</Text>
                </View>
              )}
            </View>

            <View style={styles.imageInformation}>
              <Text style={styles.imageLabel}>PROFILE_IMAGE</Text>

              <Text style={styles.imageDescription}>
                {user.profileImage.url
                  ? "CUSTOM PROFILE IMAGE ACTIVE"
                  : "FACTION EMBLEM USED ON PROFILE"}
              </Text>

              <Text style={styles.imageFallback}>
                SQUARE IMAGE // MAX_UPLOAD_5MB
              </Text>
            </View>
          </View>

          <Pressable
            onPress={chooseProfileImage}
            disabled={isUpdatingImage}
            style={({ pressed }) => [
              styles.imageAction,
              pressed && !isUpdatingImage ? styles.imageActionPressed : null,
            ]}
          >
            {isUpdatingImage ? (
              <ActivityIndicator
                style={{
                  marginHorizontal: "auto",
                }}
                size="small"
                color={Colors.dark.accent}
              />
            ) : (
              <>
                <Text style={styles.imageActionText}>
                  {user.profileImage.url
                    ? "CHANGE_PROFILE_IMAGE"
                    : "SELECT_PROFILE_IMAGE"}
                </Text>

                <Text style={styles.imageActionArrow}>→</Text>
              </>
            )}
          </Pressable>

          {user.profileImage.url ? (
            <Pressable
              onPress={deleteProfileImage}
              disabled={isUpdatingImage}
              style={({ pressed }) => [
                styles.removeImageButton,
                pressed && !isUpdatingImage
                  ? styles.removeImageButtonPressed
                  : null,
              ]}
            >
              <Text style={styles.removeImageText}>REMOVE_PROFILE_IMAGE</Text>
            </Pressable>
          ) : null}
        </View>

        {/* ERROR */}

        {error ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{`// ERROR: ${error}`}</Text>
          </View>
        ) : null}

        {/* SAVE */}

        <Pressable
          onPress={saveProfile}
          disabled={!hasChanges || isSaving}
          style={({ pressed }) => [
            styles.saveButton,
            !hasChanges || isSaving ? styles.saveButtonDisabled : null,
            pressed && hasChanges && !isSaving
              ? styles.saveButtonPressed
              : null,
          ]}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color={Colors.dark.text} />
          ) : (
            <>
              <Text
                style={[
                  styles.saveText,
                  !hasChanges ? styles.saveTextDisabled : null,
                ]}
              >
                SAVE_PROFILE
              </Text>

              <Text
                style={[
                  styles.saveArrow,
                  !hasChanges ? styles.saveTextDisabled : null,
                ]}
              >
                →
              </Text>
            </>
          )}
        </Pressable>

        <Text style={styles.footerStatus}>
          {hasChanges
            ? "// UNSAVED_PROFILE_CHANGES"
            : "// PROFILE_CONFIGURATION_SYNCHRONIZED"}
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  page: {
    flexGrow: 1,
    paddingTop: 8,
    paddingBottom: 36,
  },

  pressed: {
    opacity: 0.55,
  },

  errorContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  systemError: {
    color: Colors.dark.danger,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,

  },

  /* HEADER */

  backButton: {
    alignSelf: "flex-start",
    paddingVertical: 8,
    paddingRight: 16,
    marginBottom: 20,
  },

  backText: {
    color: Colors.dark.textMuted,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.5,
  },

  header: {
    marginBottom: 34,
  },

  eyebrow: {
    color: Colors.dark.accent,
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 2,
    marginBottom: 6,
  },

  title: {
    fontFamily: Fonts.display,
    color: Colors.dark.text,
    fontSize: 30,
    fontWeight: "900",
    letterSpacing: -0.6,
  },

  subtitle: {
    color: Colors.dark.textDim,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.1,
    lineHeight: 15,
    marginTop: 8,
    maxWidth: 320,
  },

  /* SECTIONS */

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 4,
    marginBottom: 10,
  },

  sectionCode: {
    color: Colors.dark.borderStrong,
    fontSize: 18,
    fontWeight: "900",
  },

  sectionHeading: {
    flex: 1,
  },

  sectionEyebrow: {
    color: Colors.dark.textDim,
    fontSize: 7,
    fontWeight: "900",
    letterSpacing: 1.6,
    marginBottom: 1,
  },

  sectionTitle: {
    color: Colors.dark.text,
    fontSize: 17,
    fontWeight: "800",
  },

  /* FIELDS */

  panel: {
    backgroundColor: Colors.dark.backgroundElement,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    marginBottom: 30,
  },

  field: {
    padding: 16,
  },

  fieldHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 9,
  },

  label: {
    color: Colors.dark.textTechnical,
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 1.5,
  },

  fieldLimit: {
    color: Colors.dark.textDim,
    fontSize: 8,
    fontWeight: "700",

  },

  input: {
    minHeight: 46,
    color: Colors.dark.text,
    backgroundColor: Colors.dark.backgroundDeep,
    borderWidth: 1,
    borderColor: Colors.dark.borderSubtle,
    paddingHorizontal: 12,
    fontSize: 14,
    fontWeight: "600",
  },

  divider: {
    height: 1,
    backgroundColor: Colors.dark.borderSubtle,
  },

  /* VISIBILITY */

  visibilityPanel: {
    backgroundColor: Colors.dark.backgroundElement,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },

  visibilityRow: {
    minHeight: 72,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },

  radioOuter: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: Colors.dark.borderStrong,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  radioOuterSelected: {
    borderColor: Colors.dark.accent,
  },

  radioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.dark.accent,
  },

  visibilityText: {
    flex: 1,
  },

  visibilityLabel: {
    color: Colors.dark.textSecondary,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1,
  },

  visibilityLabelSelected: {
    color: Colors.dark.text,
  },

  visibilityDescription: {
    color: Colors.dark.textDim,
    fontSize: 7,
    fontWeight: "700",
    letterSpacing: 0.7,
    marginTop: 4,
  },

  visibilityStatus: {
    color: Colors.dark.textDim,
    fontSize: 7,
    fontWeight: "900",
    letterSpacing: 0.8,
    marginLeft: 10,
  },

  visibilityStatusSelected: {
    color: Colors.dark.accent,
  },

  privacyNote: {
    color: Colors.dark.textDim,
    fontSize: 8,
    lineHeight: 13,

    marginTop: 10,
    marginBottom: 30,
  },

  /* BIO */

  bioPanel: {
    position: "relative",
    backgroundColor: Colors.dark.backgroundElement,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    padding: 16,
    marginBottom: 30,
  },

  bioInput: {
    minHeight: 120,
    color: Colors.dark.text,
    backgroundColor: Colors.dark.backgroundDeep,
    borderWidth: 1,
    borderColor: Colors.dark.borderSubtle,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 13,
    lineHeight: 19,
  },

  publicLabel: {
    alignSelf: "flex-end",
    color: Colors.dark.textDim,
    fontSize: 7,
    fontWeight: "900",
    letterSpacing: 1,
    marginTop: 9,
  },

  /* IMAGE */

  imageStatus: {
    borderWidth: 1,
    borderColor: Colors.dark.border,
    backgroundColor: Colors.dark.backgroundDeep,
    paddingHorizontal: 8,
    paddingVertical: 5,
    marginLeft: 12,
  },

  imageStatusText: {
    color: Colors.dark.textMuted,
    fontSize: 7,
    fontWeight: "900",
    letterSpacing: 0.8,
  },

  /* ERROR */

  errorBanner: {
    backgroundColor: Colors.dark.dangerSurface,
    borderWidth: 1,
    borderColor: Colors.dark.dangerBorder,
    padding: 12,
    marginBottom: 14,
  },

  errorText: {
    color: Colors.dark.danger,
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 1,
  },

  /* SAVE */

  saveButton: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    backgroundColor: Colors.dark.accent,
    borderWidth: 1,
    borderColor: Colors.dark.accent,
  },

  saveButtonPressed: {
    opacity: 0.75,
  },

  saveButtonDisabled: {
    backgroundColor: Colors.dark.backgroundElement,
    borderColor: Colors.dark.border,
  },

  saveText: {
    color: Colors.dark.backgroundDeep,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.8,
  },

  saveArrow: {
    color: Colors.dark.backgroundDeep,
    fontSize: 15,
    fontWeight: "900",
  },

  saveTextDisabled: {
    color: Colors.dark.textDim,
  },

  footerStatus: {
    color: Colors.dark.textDim,
    fontSize: 8,
    textAlign: "center",

    marginTop: 12,
  },
  /* IMAGE */

  imagePanel: {
    backgroundColor: Colors.dark.backgroundElement,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    padding: 16,
    marginBottom: 30,
  },
  profileImageArea: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },

  profileImageFrame: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 1,
    borderColor: Colors.dark.borderStrong,
    backgroundColor: Colors.dark.backgroundDeep,
    padding: 3,
    marginRight: 14,
  },

  profileImage: {
    width: "100%",
    height: "100%",
    borderRadius: 32,
  },

  profileImageEmpty: {
    flex: 1,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.dark.borderSubtle,
  },

  profileImageEmptyText: {
    color: Colors.dark.textDim,
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 1.2,
  },

  imageInformation: {
    flex: 1,
  },

  imageLabel: {
    color: Colors.dark.textTechnical,
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 1.4,
  },

  imageDescription: {
    color: Colors.dark.textSecondary,
    fontSize: 10,
    fontWeight: "700",
    marginTop: 7,
  },

  imageFallback: {
    color: Colors.dark.textDim,
    fontSize: 7,
    fontWeight: "800",
    letterSpacing: 0.7,
    marginTop: 5,
  },

  imageAction: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.dark.backgroundDeep,
    borderWidth: 1,
    borderColor: Colors.dark.borderStrong,
    paddingHorizontal: 13,
  },

  imageActionPressed: {
    backgroundColor: Colors.dark.backgroundSelected,
  },

  imageActionText: {
    color: Colors.dark.text,
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 1.2,
  },

  imageActionArrow: {
    color: Colors.dark.accent,
    fontSize: 14,
    fontWeight: "900",
  },

  removeImageButton: {
    minHeight: 40,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.dark.dangerSurface,
    borderWidth: 1,
    borderColor: Colors.dark.dangerBorder,
    marginTop: 10,
  },

  removeImageButtonPressed: {
    backgroundColor: Colors.dark.dangerSurfacePressed,
  },

  removeImageText: {
    color: Colors.dark.danger,
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 1.2,
  },
});
