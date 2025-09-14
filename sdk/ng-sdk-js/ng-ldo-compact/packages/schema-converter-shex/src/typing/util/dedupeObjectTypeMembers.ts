import type { ObjectTypeMember } from "dts-dom";
import * as dom from "dts-dom";

export function dedupeObjectTypeMembers(
  memberList: ObjectTypeMember[],
): ObjectTypeMember[] {
  const properties: Record<string, dom.PropertyDeclaration> = {};
  memberList.forEach((expression) => {
    const propertyDeclaration = expression as dom.PropertyDeclaration;
    // Combine properties if they're duplicates
    if (properties[propertyDeclaration.name]) {
      const oldPropertyDeclaration = properties[propertyDeclaration.name];
      const oldPropertyType = isLdSetType(oldPropertyDeclaration.type)
        ? oldPropertyDeclaration.type.typeArguments[0]
        : oldPropertyDeclaration.type;
      const propertyType = isLdSetType(propertyDeclaration.type)
        ? propertyDeclaration.type.typeArguments[0]
        : propertyDeclaration.type;
      const isOptional =
        propertyDeclaration.flags === dom.DeclarationFlags.Optional ||
        oldPropertyDeclaration.flags === dom.DeclarationFlags.Optional;
      properties[propertyDeclaration.name] = dom.create.property(
        propertyDeclaration.name,
        {
          kind: "name",
          name: "LdSet",
          typeArguments: [dom.create.union([oldPropertyType, propertyType])],
        },
        isOptional ? dom.DeclarationFlags.Optional : dom.DeclarationFlags.None,
      );
      // Set JS Comment
      properties[propertyDeclaration.name].jsDocComment =
        oldPropertyDeclaration.jsDocComment && propertyDeclaration.jsDocComment
          ? `${oldPropertyDeclaration.jsDocComment} | ${propertyDeclaration.jsDocComment}`
          : oldPropertyDeclaration.jsDocComment ||
            propertyDeclaration.jsDocComment;
    } else {
      properties[propertyDeclaration.name] = propertyDeclaration;
    }
  });
  return Object.values(properties);
}

function isLdSetType(
  potentialLdSet: dom.Type,
): potentialLdSet is dom.NamedTypeReference {
  return (
    (potentialLdSet as dom.NamedTypeReference).kind === "name" &&
    (potentialLdSet as dom.NamedTypeReference).name === "LdSet"
  );
}
