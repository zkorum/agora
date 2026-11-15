import ts from "typescript";

/** @param {ts.Type} type */
function isReader(type) {
    if (type.isUnion()) return type.types.some(isReader);
    return (
        type.getProperty("select") !== undefined &&
        type.getProperty("selectDistinct") !== undefined &&
        type.getProperty("$count") !== undefined &&
        type.getProperty("insert") === undefined &&
        type.getProperty("transaction") === undefined
    );
}

/** @type {import("eslint").Rule.RuleModule} */
export const noReplicaRowLocks = {
    meta: {
        type: "problem",
        docs: {
            description:
                "Keep row-locking SELECTs off replica-eligible readers",
        },
        schema: [],
        messages: {
            primaryRequired:
                "Row locks require getPrimaryDatabase(db) or a transaction, not a replica-eligible reader.",
        },
    },
    create(context) {
        const services = context.sourceCode.parserServices;
        const checker = services.program?.getTypeChecker();
        if (!checker || !services.esTreeNodeToTSNodeMap) {
            throw new Error(
                "no-replica-row-locks requires typed parser services",
            );
        }

        function isReplicaRead({ node, seen = new Set() }) {
            if (seen.has(node)) return false;
            seen.add(node);
            const type = checker.getTypeAtLocation(node);
            // Check capabilities, not an alias's spelling: mapped/renamed reader
            // types must retain the same restriction. A union may include a reader.
            if (isReader(type)) return true;

            if (
                ts.isCallExpression(node) &&
                (ts.isPropertyAccessExpression(node.expression) ||
                    ts.isElementAccessExpression(node.expression))
            ) {
                return isReplicaRead({
                    node: node.expression.expression,
                    seen,
                });
            }
            // Follow local aliases and saved builders, not just inline chains.
            if (ts.isIdentifier(node)) {
                const declaration =
                    checker.getSymbolAtLocation(node)?.valueDeclaration;
                if (
                    declaration &&
                    ts.isVariableDeclaration(declaration) &&
                    declaration.initializer
                ) {
                    return isReplicaRead({
                        node: declaration.initializer,
                        seen,
                    });
                }
            }
            if (
                ts.isParenthesizedExpression(node) ||
                ts.isSatisfiesExpression(node) ||
                ts.isAsExpression(node) ||
                ts.isNonNullExpression(node)
            ) {
                return isReplicaRead({ node: node.expression, seen });
            }
            return false;
        }

        return {
            CallExpression(node) {
                if (
                    node.callee.type === "MemberExpression" &&
                    ((node.callee.property.type === "Identifier" &&
                        !node.callee.computed &&
                        node.callee.property.name === "for") ||
                        (node.callee.computed &&
                            node.callee.property.type === "Literal" &&
                            node.callee.property.value === "for")) &&
                    isReplicaRead({
                        node: services.esTreeNodeToTSNodeMap.get(
                            node.callee.object,
                        ),
                    })
                ) {
                    context.report({ node, messageId: "primaryRequired" });
                }
            },
        };
    },
};
