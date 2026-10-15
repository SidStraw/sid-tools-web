export const selectionDemo = `diff --git a/src/app.ts b/src/app.ts
index deadbeef..feedbeef 100644
--- a/src/app.ts
+++ b/src/app.ts
@@ -1 +1 @@ PRIVATE_SECTION_LABEL
-const label = "before";
+const label = "after";
@@ -10 +10 @@ PRIVATE_HUNK_LABEL
-const token = "SYNTHETIC_OLD_SECRET";
+const token = "SYNTHETIC_NEW_SECRET";
diff --git a/secrets/private.env b/secrets/private.env
new file mode 100644
--- /dev/null
+++ b/secrets/private.env
@@ -0,0 +1 @@
+TOKEN=ONLY_PRIVATE_BODY
diff --git a/obsolete.txt b/obsolete.txt
deleted file mode 100644
--- a/obsolete.txt
+++ /dev/null
@@ -1 +0,0 @@
-old note
diff --git a/old-name.md b/docs/new-name.md
similarity index 100%
rename from old-name.md
rename to docs/new-name.md`;

export const incompleteDemo = `diff --git a/ok.txt b/ok.txt
--- a/ok.txt
+++ b/ok.txt
@@ -1 +1 @@
-before
+after
diff --git a/image.png b/image.png
Binary files a/image.png and b/image.png differ
diff --git a/broken.txt b/broken.txt
--- a/broken.txt
+++ b/broken.txt
@@ -1,2 +1,2 @@
-one
+two`;
